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

// Auto-connect on module load
const mongoUrl = process.env.DATABASE_URL || process.env.MONGO_URL || 'mongodb://mongo:27017/mediadb';
console.log('[database] Connecting to MongoDB:', mongoUrl);

// Store the connection promise
const connectionPromise = mongoose.connect(mongoUrl, {
  autoIndex: false,
  maxPoolSize: 10,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 0,  // No timeout
  connectTimeoutMS: 30000,
  retryWrites: true,
  retryReads: true,
  keepAlive: true,
  waitQueueTimeoutMS: 60000,  // Longer wait for queue
});

connectionPromise.catch(err => {
  console.error('[database] Connection failed:', err);
  process.exit(1);
});

/**
 * Wait for MongoDB connection to be ready
 */
export async function waitForConnection(maxWaitMs: number = 60000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Check readyState
      if (mongoose.connection.readyState !== 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      // Also perform a ping to ensure connection is really working
      const adminDb = mongoose.connection.getClient().db('admin');
      await adminDb.command({ ping: 1 });
      
      console.log('[database] ✅ Connection verified and responding!');
      return;
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw new Error(`MongoDB connection timeout after ${maxWaitMs}ms`);
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
  waitForConnection,
  disconnectDB,
  getConnectionStatus,
};
