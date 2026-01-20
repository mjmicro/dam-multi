/**
 * Upload Service - Handles file upload operations
 * Single Responsibility: File upload logic only
 * 
 * Handles:
 * - Base64 file uploads
 * - Presigned URL generation
 * - File finalization
 * - MinIO interactions
 * - Asset creation after upload
 */

import * as Minio from 'minio';
import { CreateAssetDTO } from '@dam/database';
import { AssetService } from './asset-service';

export interface UploadRequest {
  originalName: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface PresignedUrlResponse {
  url: string;
  objectName: string;
  expiresIn: number;
}

export interface UploadResponse {
  assetId: string;
  objectName: string;
  jobId: string;
  filename: string;
  size: number;
  status: string;
}

export interface FinalizeRequest {
  objectName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export class UploadService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
  ];

  constructor(
    private minioClient: Minio.Client,
    private assetService: AssetService,
    private bucketName: string = 'assets'
  ) {}

  /**
   * Upload file from base64 data
   */
  async uploadFromBase64(request: UploadRequest): Promise<UploadResponse> {
    // Validate request
    this.validateUploadRequest(request);

    // Convert base64 to buffer
    const buffer = Buffer.from(request.data, 'base64');
    this.validateFileSize(buffer.length);

    // Generate object name
    const objectName = this.generateObjectName(request.originalName);

    if(await this.fileExistsInMinIO(objectName)) {
      throw new Error(`File with name ${objectName} already exists in storage`);
    }
    // Upload to MinIO
    await this.uploadToMinIO(objectName, buffer, request.mimeType);

    // Create asset record
    const assetData: CreateAssetDTO = {
      filename: objectName,
      originalName: request.originalName,
      mimeType: request.mimeType,
      size: buffer.length,
      providerPath: objectName,
    };

    const asset = await this.assetService.createAsset(assetData);

    // Queue for processing
    const jobId = await this.assetService.queueAssetForProcessing(
      (asset._id as string).toString(),
      request.originalName,
      request.mimeType,
      objectName
    );

    return {
      assetId: (asset._id as string).toString(),
      objectName,
      jobId,
      filename: request.originalName,
      size: buffer.length,
      status: asset.status,
    };
  }

  /**
   * Check if file exists in MinIO
   */
  async fileExistsInMinIO(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound' || error.message.includes('Not Found')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete file from MinIO
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      console.log(`✓ Deleted from MinIO: ${objectName}`);
    } catch (error) {
      console.warn(`Warning: Failed to delete ${objectName} from MinIO: ${error}`);
    }
  }

  /**
   * Private: Validate upload request
   */
  private validateUploadRequest(request: UploadRequest): void {
    if (!request.originalName || request.originalName.trim().length === 0) {
      throw new Error('originalName is required');
    }

    if (!request.data || request.data.trim().length === 0) {
      throw new Error('data (base64) is required');
    }

    if (!request.mimeType || request.mimeType.trim().length === 0) {
      throw new Error('mimeType is required');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(request.mimeType)) {
      throw new Error(`MIME type ${request.mimeType} is not allowed`);
    }
  }

  /**
   * Private: Validate finalize request
   */
  private validateFinalizeRequest(request: FinalizeRequest): void {
    if (!request.objectName || request.objectName.trim().length === 0) {
      throw new Error('objectName is required');
    }

    if (!request.originalName || request.originalName.trim().length === 0) {
      throw new Error('originalName is required');
    }

    if (!request.mimeType || request.mimeType.trim().length === 0) {
      throw new Error('mimeType is required');
    }

    if (!request.size || request.size <= 0) {
      throw new Error('size must be greater than 0');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(request.mimeType)) {
      throw new Error(`MIME type ${request.mimeType} is not allowed`);
    }
  }

  /**
   * Private: Validate file size
   */
  private validateFileSize(size: number): void {
    if (size > this.MAX_FILE_SIZE) {
      throw new Error(
        `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 100MB`
      );
    }

    if (size <= 0) {
      throw new Error('File size must be greater than 0');
    }
  }

  /**
   * Private: Generate unique object name
   */
  private generateObjectName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const sanitized = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `uploads/${timestamp}-${random}-${sanitized}`;
  }

  /**
   * Private: Upload to MinIO
   */
  private async uploadToMinIO(
    objectName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void> {
    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        buffer.length,
        { 'Content-Type': mimeType }
      );
      console.log(
        `✓ File uploaded to MinIO: ${objectName} (${(buffer.length / 1024).toFixed(2)}KB)`
      );
    } catch (error) {
      throw new Error(`MinIO upload failed: ${error}`);
    }
  }
}
