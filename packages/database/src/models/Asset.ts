import { Schema, Model, Document } from 'mongoose';
import mongoose from 'mongoose';
import { AssetStatus } from '../types';

/**
 * Asset model schema definition
 * Represents media files in the DAM system
 */

export interface IAssetDocument extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  providerPath: string;
  status: AssetStatus;
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

export const createAssetSchema = (): Schema<IAssetDocument> => {
  return new Schema<IAssetDocument>(
    {
      filename: {
        type: String,
        required: true,
        index: true,
        description: 'Stored filename in MinIO',
      },
      originalName: {
        type: String,
        required: true,
        description: 'Original filename uploaded by user',
      },
      mimeType: {
        type: String,
        default: 'application/octet-stream',
        description: 'MIME type of the file',
      },
      size: {
        type: Number,
        required: true,
        description: 'File size in bytes',
      },
      providerPath: {
        type: String,
        required: true,
        index: true,
        description: 'Path in MinIO bucket',
      },
      status: {
        type: String,
        enum: Object.values(AssetStatus),
        default: AssetStatus.PENDING,
        index: true,
        description: 'Current processing state',
      },
      metadata: {
        width: { type: Number },
        height: { type: Number },
        duration: { type: Number },
        bitrate: { type: Number },
        format: { type: String },
      },
      error: {
        type: String,
        description: 'Error message if processing failed',
      },
      createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      collection: 'assets',
      timestamps: true,
    }
  );
};

/**
 * Get or create Asset model
 * Always uses the mongoose instance from this module (which has the active connection)
 */
export function getAssetModel(mongooseInstance?: typeof import('mongoose')): Model<IAssetDocument> {
  // Always use the module's mongoose instance which has the connection
  const instance = mongoose;
  
  if (instance.models.Asset) {
    return instance.models.Asset;
  }
  
  const schema = createAssetSchema();
  return instance.model<IAssetDocument>('Asset', schema);
}