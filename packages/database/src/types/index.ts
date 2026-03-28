/**
 * Shared type definitions and enums
 * Used across API, Worker, and other services
 */

/**
 * Asset processing status enum
 */
export enum AssetStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  PROCESSED_NO_FILE = 'PROCESSED_NO_FILE',
}

/**
 * Asset document interface
 */
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

/**
 * Thumbnail document interface
 */
export interface IThumbnail {
  _id?: string;
  assetId: string;
  providerPath: string;
  width: number;
  height: number;
  size?: number;
  createdAt: Date;
}

/**
 * Asset creation DTO (Data Transfer Object)
 */
export interface CreateAssetDTO {
  originalName: string;
  mimeType: string;
  size: number;
  filename: string;
  providerPath: string;
}

/**
 * Thumbnail creation DTO
 */
export interface CreateThumbnailDTO {
  assetId: string;
  providerPath: string;
  width: number;
  height: number;
  size?: number;
}

/**
 * Media processing job payload for queue
 */
export interface ProcessMediaJobPayload {
  assetId: string;
  filename: string;
  mimeType: string;
  providerPath: string;
}

/**
 * Video rendition document interface
 */
export interface IVideoRendition {
  _id?: string;
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

/**
 * Video rendition creation DTO
 */
export interface CreateVideoRenditionDTO {
  assetId: string;
  label: string;
  providerPath: string;
  width: number;
  height: number;
  size?: number;
  bitrate: number;
  format: string;
  isOriginal: boolean;
}

/**
 * Asset query filters
 */
export interface AssetQueryFilters {
  status?: AssetStatus;
  mimeType?: string;
  name?: string;
  tags?: string[];
  type?: 'image' | 'video' | 'audio';
}
