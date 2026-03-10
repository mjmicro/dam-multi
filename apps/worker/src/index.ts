import 'dotenv/config';
import mongoose from 'mongoose';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as Minio from 'minio';
import {
  getAssetModel,
  ProcessMediaJobPayload,
  AssetStatus,
} from '@dam/database';
import { MediaProcessor } from './mediaProcessor';

/**
 * Worker configuration from environment
 */
const mongoUrl =
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  'mongodb://mongo:27017/mediadb';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const minioEndpoint = process.env.MINIO_ENDPOINT || 'minio';
const minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'admin';
const minioSecretKey = process.env.MINIO_SECRET_KEY || 'password';
const minioUseSSL = process.env.MINIO_USE_SSL === 'true';

// Initialize MinIO client
const minioClient = new Minio.Client({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: minioUseSSL,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey,
});

/**
 * Main worker function
 */
async function startWorker(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUrl, { autoIndex: false });
    const Asset = getAssetModel(mongoose);
    console.log('Worker: Mongoose connected to', mongoUrl);

    // Initialize Redis connection for BullMQ
    const redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    console.log('Worker: Redis connected');

    // Create queue
    const assetQueue = new Queue('asset-tasks', { connection: redisConnection });

    // Initialize media processor
    const mediaProcessor = new MediaProcessor(minioClient, 'assets');
    await mediaProcessor.ensureTempDir();

    // Create worker with media processing
    const worker = new Worker('asset-tasks', async (job) => {
      const { assetId, filename, mimeType, providerPath } =
        job.data as ProcessMediaJobPayload;
      console.log(`Processing job ${job.id} for asset ${assetId}`);

      try {
        // Update status to PROCESSING
        await Asset.findByIdAndUpdate(assetId, {
          status: AssetStatus.PROCESSING,
          updatedAt: new Date(),
        });
        console.log(`   Status updated to ${AssetStatus.PROCESSING}`);

        // Check if object exists in MinIO with retry
        let fileFound = false;
        const maxAttempts = 3;
        const retryDelayMs = 2000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const objStat = await minioClient.statObject('assets', providerPath);
            console.log(
              `   File found in MinIO (attempt ${attempt}): ${objStat.size} bytes`
            );
            fileFound = true;
            break;
          } catch (err: any) {
            if (attempt < maxAttempts) {
              console.log(
                `   Attempt ${attempt}: File not found yet, retrying in ${retryDelayMs}ms...`
              );
              await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            } else {
              console.log(
                `   File not found in MinIO after ${maxAttempts} attempts: ${err.message}`
              );
            }
          }
        }

        if (!fileFound) {
          throw new Error('File not found in MinIO after retries');
        }

        // Process media based on mime type
        let metadata: any = {};
        let thumbnailPath: string | undefined;
        let transcodedFiles: any[] = [];

        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
        const isAudio = mimeType.startsWith('audio/');

        if (isImage) {
          const result = await mediaProcessor.processImage(assetId, providerPath);
          metadata = result.metadata;
          thumbnailPath = result.thumbnailPath;
          console.log(`   Image processed with thumbnail`);
        } else if (isVideo) {
          const result = await mediaProcessor.processVideo(assetId, providerPath);
          metadata = result.metadata;
          thumbnailPath = result.thumbnailPath;
          transcodedFiles = result.transcodedFiles;
          console.log(
            `   Video processed: ${transcodedFiles.length} resolutions`
          );
        } else if (isAudio) {
          // For audio, just extract metadata
          const tempPath = await mediaProcessor.downloadFromMinIO(providerPath);
          metadata = await mediaProcessor.extractVideoMetadata(tempPath);
          console.log(`   Audio metadata extracted`);
        }

        // Update asset with metadata and processed status
        await Asset.findByIdAndUpdate(assetId, {
          status: AssetStatus.PROCESSED,
          metadata: {
            ...metadata,
            transcoded: transcodedFiles,
            thumbnail: thumbnailPath,
          },
          updatedAt: new Date(),
        });

        console.log(`   Asset ${assetId} marked as PROCESSED`);

        // Cleanup temp files
        await mediaProcessor.cleanup(assetId);

        return {
          success: true,
          assetId,
          fileFound,
          metadata,
          thumbnailPath,
          transcodedCount: transcodedFiles.length,
        };
      } catch (err: any) {
        console.error(`   Job failed: ${err.message}`);
        // Update status to FAILED
        await Asset.findByIdAndUpdate(assetId, {
          status: AssetStatus.FAILED,
          error: err.message,
          updatedAt: new Date(),
        });

        // Try to cleanup even on failure
        try {
          await mediaProcessor.cleanup(assetId);
        } catch (cleanupErr) {
          console.warn('Cleanup failed:', cleanupErr);
        }

        throw err;
      }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err.message);
    });

    console.log('Media Worker Ready - Watch Mode Enabled - Listening for jobs...');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await worker.close();
      await redisConnection.quit();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (err: any) {
    console.error('Worker init error:', err.message);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});