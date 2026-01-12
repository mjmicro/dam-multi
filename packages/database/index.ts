/**
 * Database Package Entry Point
 * Exports models, types, and connection utilities
 */

import mongoose from 'mongoose';

// Export types and enums
export type {
  IAsset,
  IThumbnail,
  CreateAssetDTO,
  CreateThumbnailDTO,
  ProcessMediaJobPayload,
  AssetQueryFilters,
} from './src/types';
export { AssetStatus } from './src/types';

// Export models
export { getAssetModel, createAssetSchema, type IAssetDocument } from './src/models/Asset';
export { getThumbnailModel, createThumbnailSchema, type IThumbnailDocument } from './src/models/Thumbnail';

/**
 * Connect to MongoDB
 * @param mongoUrl MongoDB connection string (optional, uses env or default)
 */
export async function connectDB(mongoUrl?: string): Promise<void> {
  const url =
    mongoUrl ||
    process.env.DATABASE_URL ||
    process.env.MONGO_URL ||
    'mongodb://mongo:27017/mediadb';

  try {
    await mongoose.connect(url, {
      autoIndex: false,
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): number {
  return mongoose.connection.readyState;
}

export default {
  connectDB,
  disconnectDB,
  getConnectionStatus,
};
