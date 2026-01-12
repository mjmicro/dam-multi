import { Schema, Model, Document } from 'mongoose';

/**
 * Asset Schema - Shared between API and Worker
 * Represents a media file managed by DAM
 */
export const createAssetSchema = (): Schema => {
  return new Schema({
    filename: {
      type: String,
      required: true,
      description: 'Stored filename in MinIO'
    },
    originalName: {
      type: String,
      required: true,
      description: 'Original filename uploaded by user'
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
      description: 'MIME type of the file'
    },
    size: {
      type: Number,
      required: true,
      description: 'File size in bytes'
    },
    providerPath: {
      type: String,
      required: true,
      description: 'Path in MinIO bucket'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'PROCESSED_NO_FILE'],
      default: 'PENDING',
      description: 'Current processing state'
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      bitrate: Number,
      format: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    error: {
      type: String,
      description: 'Error message if processing failed'
    }
  }, { collection: 'assets' });
};

/**
 * Thumbnail Schema - Shared between API and Worker
 * Represents generated thumbnail images for assets
 */
export const createThumbnailSchema = (): Schema => {
  return new Schema({
    assetId: {
      type: String,
      required: true,
      description: 'Reference to parent asset'
    },
    providerPath: {
      type: String,
      required: true,
      description: 'Path in MinIO bucket'
    },
    width: {
      type: Number,
      required: true,
      description: 'Thumbnail width in pixels'
    },
    height: {
      type: Number,
      required: true,
      description: 'Thumbnail height in pixels'
    },
    size: {
      type: Number,
      description: 'File size in bytes'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }, { collection: 'thumbnails' });
};

/**
 * Type definitions for Asset and Thumbnail documents
 */
export interface IAsset extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  providerPath: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'PROCESSED_NO_FILE';
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    format?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface IThumbnail extends Document {
  assetId: string;
  providerPath: string;
  width: number;
  height: number;
  size?: number;
  createdAt: Date;
}

/**
 * DTO (Data Transfer Object) for creating assets
 */
export interface CreateAssetDTO {
  originalName: string;
  mimeType: string;
  size: number;
  filename: string;
  providerPath: string;
}

/**
 * DTO for creating thumbnails
 */
export interface CreateThumbnailDTO {
  assetId: string;
  providerPath: string;
  width: number;
  height: number;
  size?: number;
}

/**
 * Queue job payload
 */
export interface ProcessMediaJobPayload {
  assetId: string;
  objectName: string;
  mimeType: string;
}
