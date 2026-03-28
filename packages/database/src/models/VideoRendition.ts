import { Schema, Model, Document } from 'mongoose';
import mongoose from 'mongoose';

export interface IVideoRenditionDocument extends Document {
  assetId: string;
  label: string;
  providerPath: string;
  width: number;
  height: number;
  size: number;
  bitrate: number;
  format: string;
  isOriginal: boolean;
  createdAt: Date;
}

const videoRenditionSchema = new Schema<IVideoRenditionDocument>(
  {
    assetId: { type: String, required: true, index: true },
    label: { type: String, required: true },
    providerPath: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    size: { type: Number, required: false, default: 0 },
    bitrate: { type: Number, required: true },
    format: { type: String, required: true },
    isOriginal: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, default: Date.now, immutable: true, index: true },
  },
  {
    collection: 'video_renditions',
    timestamps: false,
  },
);

videoRenditionSchema.index({ assetId: 1, label: 1 });

export function getVideoRenditionModel(): Model<IVideoRenditionDocument> {
  if (mongoose.models['VideoRendition']) {
    return mongoose.models['VideoRendition'] as Model<IVideoRenditionDocument>;
  }
  return mongoose.model<IVideoRenditionDocument>('VideoRendition', videoRenditionSchema);
}
