import {
  IAsset,
  CreateAssetDTO,
  ProcessMediaJobPayload,
  AssetStatus,
  AssetQueryFilters,
} from '@dam/database';
import { Queue } from 'bullmq';
import * as Minio from 'minio';
import { AssetRepository } from '../repositories/asset-repository';

/**
 * AssetService - Business logic layer
 * Handles:
 * - Orchestrating repository and external services
 * - File uploads to MinIO
 * - Queue job creation
 * - Business logic validation
 */
export class AssetService {
  constructor(
    private repository: AssetRepository,
    private minioClient: Minio.Client,
    private assetQueue: Queue
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
   * Get asset by ID
   */
  async getAssetById(id: string): Promise<IAsset | null> {
    return this.repository.findById(id);
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
}
