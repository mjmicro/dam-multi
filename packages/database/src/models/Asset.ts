import { Schema, Model, Document } from 'mongoose';
import mongoose from 'mongoose';
import { AssetStatus } from '../types/index.js';

export interface IAssetDocument extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  providerPath: string;
  status: AssetStatus;
  tags: string[];
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

export interface IAsset {
  _id?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  providerPath: string;
  status: AssetStatus;
  tags: string[];
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

export interface AssetQueryFilters {
  status?: AssetStatus;
  mimeType?: string;
  name?: string;
  tags?: string[];
  type?: 'image' | 'video' | 'audio';
}

export interface CreateAssetDTO {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  providerPath: string;
}

export interface ProcessMediaJobPayload {
  assetId: string;
  filename: string;
  mimeType: string;
  providerPath: string;
}

const assetSchema = new Schema<IAssetDocument>(
  {
    filename: { type: String, required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    providerPath: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AssetStatus),
      default: AssetStatus.PENDING,
      index: true,
    },
    metadata: {
      width: { type: Number },
      height: { type: Number },
      duration: { type: Number },
      bitrate: { type: Number },
      format: { type: String },
    },
    tags: { type: [String], default: [], index: true },
    error: { type: String },
  },
  {
    collection: 'assets',
    timestamps: true,
  },
);

export function getAssetModel(): Model<IAssetDocument> {
  if (mongoose.models['Asset']) {
    return mongoose.models['Asset'] as Model<IAssetDocument>;
  }
  return mongoose.model<IAssetDocument>('Asset', assetSchema);
}
