import {
  IAsset,
  IVideoRenditionDocument,
  CreateAssetDTO,
  ProcessMediaJobPayload,
  AssetStatus,
  AssetQueryFilters,
} from '@dam/database';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import * as Minio from 'minio';
import { AssetRepository } from '../repositories/asset-repository';
import { DEFAULT_BUCKET_NAME } from '../config/constants';
import { createExternalSignerClient } from '../config/minio';

/**
 * AssetService - Business logic layer
 * Handles:
 * - Orchestrating repository and external services
 * - File uploads to MinIO
 * - Queue job creation
 * - Business logic validation
 */
export interface RenditionInfo {
  label: string;
  width: number;
  height: number;
  bitrate: number;
  format: string;
  isOriginal: boolean;
}

export class AssetService {
  constructor(
    private repository: AssetRepository,
    private minioClient: Minio.Client,
    private assetQueue: Queue,
    private minioExternalUrl: string,
    private renditionModel: Model<IVideoRenditionDocument>,
  ) {}

  /**
   * Create a new asset with file upload
   */
  async createAsset(data: CreateAssetDTO): Promise<IAsset> {
    try {
      return await this.repository.create(data);
    } catch (error) {
      throw new Error(`Failed to create asset: ${error}`);
    }
  }

  /**
   * Get asset by ID, with renditions attached for video assets
   */
  async getAssetById(id: string): Promise<(IAsset & { renditions?: RenditionInfo[] }) | null> {
    const asset = await this.repository.findById(id);
    if (!asset) return null;

    if (asset.mimeType.startsWith('video/')) {
      const renditionDocs = await this.renditionModel
        .find({ assetId: id })
        .sort({ isOriginal: -1, label: 1 })
        .lean();
      const renditions: RenditionInfo[] = renditionDocs.map((r) => ({
        label: r.label,
        width: r.width,
        height: r.height,
        bitrate: r.bitrate,
        format: r.format,
        isOriginal: r.isOriginal,
      }));
      return { ...asset, renditions };
    }

    return asset;
  }

  /**
   * Get all assets with optional filters
   */
  async getAllAssets(filters?: AssetQueryFilters): Promise<IAsset[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Upload file to MinIO
   */
  async uploadToMinIO(
    bucket: string,
    objectName: string,
    fileBuffer: Buffer,
    metadata: Record<string, string>,
  ): Promise<number> {
    try {
      await this.minioClient.putObject(bucket, objectName, fileBuffer, fileBuffer.length, metadata);
      console.log(`File uploaded to MinIO: ${objectName} (${fileBuffer.length} bytes)`);
      return fileBuffer.length;
    } catch (error) {
      throw new Error(`MinIO upload failed: ${error}`);
    }
  }

  /**
   * Queue asset for processing
   */
  async queueAssetForProcessing(
    assetId: string,
    filename: string,
    mimeType: string,
    providerPath: string,
  ): Promise<string> {
    try {
      const payload: ProcessMediaJobPayload = {
        assetId,
        filename,
        mimeType,
        providerPath,
      };

      const job = await this.assetQueue.add('process-media', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });

      return job.id || '';
    } catch (error) {
      throw new Error(`Failed to queue asset: ${error}`);
    }
  }

  /**
   * Delete asset from MinIO and database
   */
  async deleteAsset(id: string, minIOObjectName: string): Promise<boolean> {
    try {
      // Delete from MinIO
      try {
        await this.minioClient.removeObject(DEFAULT_BUCKET_NAME, minIOObjectName);
      } catch (err) {
        console.warn(`Warning: Could not delete ${minIOObjectName} from MinIO: ${err}`);
      }

      // Delete from database
      return await this.repository.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete asset: ${error}`);
    }
  }

  /**
   * Get assets by status
   */
  async getAssetsByStatus(status: AssetStatus): Promise<IAsset[]> {
    return this.repository.findByStatus(status);
  }

  /**
   * Count total assets
   */
  async countAssets(): Promise<number> {
    return this.repository.count();
  }

  /**
   * Generate a short-lived MinIO presigned URL for preview/download.
   * Pass renditionLabel to presign a specific transcoded version.
   */
  async getPresignedAssetUrl(
    assetId: string,
    purpose: 'preview' | 'download',
    expiryMinutes: number,
    renditionLabel?: string,
  ): Promise<{ url: string }> {
    const asset = await this.repository.findById(assetId);

    if (!asset) {
      throw new Error('Asset not found');
    }

    // Enforce 15–60 minute expiry window.
    const clampedMinutes = Math.max(15, Math.min(60, Math.floor(expiryMinutes)));
    const expirySeconds = clampedMinutes * 60;

    let objectName = asset.providerPath || asset.filename;

    if (renditionLabel) {
      const rendition = await this.renditionModel
        .findOne({ assetId, label: renditionLabel })
        .lean();
      if (rendition) objectName = rendition.providerPath;
    }
    const safeOriginalName = asset.originalName.replace(/"/g, '').replace(/[\r\n]/g, '');

    // MinIO presigned response overrides.
    const reqParams: Record<string, string> = {
      'response-content-type': asset.mimeType,
      'response-content-disposition':
        purpose === 'download' ? `attachment; filename="${safeOriginalName}"` : 'inline',
    };

    // Use external sign client if configured to ensure signature is valid for browser URLs
    const signerClient =
      this.minioExternalUrl && this.minioExternalUrl.trim()
        ? createExternalSignerClient(this.minioExternalUrl)
        : this.minioClient;

    const signedUrl = await signerClient.presignedGetObject(
      DEFAULT_BUCKET_NAME,
      objectName,
      expirySeconds,
      reqParams,
    );

    return { url: signedUrl };
  }
}
