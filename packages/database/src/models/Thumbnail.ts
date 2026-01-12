import { Schema, Model, Document } from 'mongoose';

/**
 * Thumbnail model schema definition
 * Represents generated thumbnails for assets
 */

export interface IThumbnailDocument extends Document {
  assetId: string;
  providerPath: string;
  width: number;
  height: number;
  size?: number;
  createdAt: Date;
}

export const createThumbnailSchema = (): Schema<IThumbnailDocument> => {
  return new Schema<IThumbnailDocument>(
    {
      assetId: {
        type: String,
        required: true,
        index: true,
        description: 'Reference to parent asset',
      },
      providerPath: {
        type: String,
        required: true,
        index: true,
        description: 'Path in MinIO bucket',
      },
      width: {
        type: Number,
        required: true,
        description: 'Thumbnail width in pixels',
      },
      height: {
        type: Number,
        required: true,
        description: 'Thumbnail height in pixels',
      },
      size: {
        type: Number,
        description: 'File size in bytes',
      },
      createdAt: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true,
      },
    },
    {
      collection: 'thumbnails',
      timestamps: false,
    }
  );
};

/**
 * Get or create Thumbnail model
 */
export function getThumbnailModel(mongooseInstance: typeof import('mongoose')): Model<IThumbnailDocument> {
  if (mongooseInstance.models.Thumbnail) {
    return mongooseInstance.models.Thumbnail;
  }
  const schema = createThumbnailSchema();
  return mongooseInstance.model<IThumbnailDocument>('Thumbnail', schema);
}
