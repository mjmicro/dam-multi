import { Model } from 'mongoose';
import {
  IAsset,
  CreateAssetDTO,
  ProcessMediaJobPayload,
  AssetStatus,
  AssetQueryFilters,
  IAssetDocument,
} from '@dam/database';
import { Queue } from 'bullmq';
import * as Minio from 'minio';

/**
 * AssetService - Business logic for asset management
 * Handles:
 * - Asset CRUD operations
 * - File uploads to MinIO
 * - Queue job creation
 */
export class AssetService {
  constructor(
    private assetModel: Model<IAssetDocument>,
    private minioClient: Minio.Client,
    private assetQueue: Queue
  ) {}

  /**
   * Create a new asset
   */
  async createAsset(data: CreateAssetDTO): Promise<IAsset> {
    try {
      const asset = await this.assetModel.create({
        filename: data.filename,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        providerPath: data.providerPath,
        status: AssetStatus.PENDING,
        updatedAt: new Date(),
      });
      return asset.toObject();
    } catch (error) {
      throw new Error(`Failed to create asset: ${error}`);
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<IAsset | null> {
    const asset = await this.assetModel.findById(id).lean();
    return asset as IAsset | null;
  }

  /**
   * Get all assets with optional filters
   */
  async getAllAssets(filters?: AssetQueryFilters): Promise<IAsset[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.mimeType) query.mimeType = filters.mimeType;
    return this.assetModel.find(query).lean();
  }

  /**
   * Update asset status
   */
  async updateAssetStatus(
    id: string,
    status: AssetStatus,
    error?: string
  ): Promise<IAsset | null> {
    const updateData: any = { status, updatedAt: new Date() };
    if (error) updateData.error = error;
    const asset = await this.assetModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .lean();
    return asset as IAsset | null;
  }

  /**
   * Upload file to MinIO
   */
  async uploadToMinIO(
    bucket: string,
    objectName: string,
    fileBuffer: Buffer,
    metadata: Record<string, string>
  ): Promise<number> {
    try {
      await this.minioClient.putObject(
        bucket,
        objectName,
        fileBuffer,
        fileBuffer.length,
        metadata
      );
      return fileBuffer.length;
    } catch (error) {
      throw new Error(`MinIO upload failed: ${error}`);
    }
  }

  /**
   * Check if file exists in MinIO
   */
  async fileExistsInMinIO(bucket: string, objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(bucket, objectName);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.message.includes('Not Found')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Queue asset for processing
   */
  async queueAssetForProcessing(
    assetId: string,
    filename: string,
    mimeType: string,
    providerPath: string
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
        await this.minioClient.removeObject('assets', minIOObjectName);
      } catch (err) {
        console.warn(
          `Warning: Could not delete ${minIOObjectName} from MinIO: ${err}`
        );
      }

      // Delete from database
      const result = await this.assetModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete asset: ${error}`);
    }
  }

  /**
   * Get assets by status
   */
  async getAssetsByStatus(status: AssetStatus): Promise<IAsset[]> {
    const assets = await this.assetModel.find({ status }).lean();
    return assets as IAsset[];
  }

  /**
   * Count total assets
   */
  async countAssets(): Promise<number> {
    return this.assetModel.countDocuments();
  }
}
