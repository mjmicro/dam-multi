import 'dotenv/config';
import mongoose from 'mongoose';
import { Queue, QueueEvents, Worker } from 'bullmq';
import * as Minio from 'minio';
import {
  getAssetModel,
  getThumbnailModel,
  ProcessMediaJobPayload,
  AssetStatus,
} from '@dam/database';
import { MediaProcessor } from './mediaProcessor';
import {
  DEFAULT_MINIO_ENDPOINT,
  DEFAULT_MINIO_PORT,
  DEFAULT_MINIO_ACCESS_KEY,
  DEFAULT_MINIO_SECRET_KEY,
  DEFAULT_MINIO_USE_SSL,
  DEFAULT_MINIO_BUCKET,
  DEFAULT_REDIS_URL,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_WORKER_CONCURRENCY,
} from './constants';

/**
 * Worker configuration from environment
 */
const mongoUrl =
  process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://mongo:27017/mediadb';
const redisUrl = process.env.REDIS_URL || DEFAULT_REDIS_URL;
const minioEndpoint = process.env.MINIO_ENDPOINT || DEFAULT_MINIO_ENDPOINT;
const minioPort = parseInt(process.env.MINIO_PORT || String(DEFAULT_MINIO_PORT), 10);
const minioAccessKey = process.env.MINIO_ACCESS_KEY || DEFAULT_MINIO_ACCESS_KEY;
const minioSecretKey = process.env.MINIO_SECRET_KEY || DEFAULT_MINIO_SECRET_KEY;
const minioUseSSL = process.env.MINIO_USE_SSL === 'true' || DEFAULT_MINIO_USE_SSL;

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
    const Asset = getAssetModel();
    const Thumbnail = getThumbnailModel();
    console.log('Worker: Mongoose connected to', mongoUrl);

    const connection = {
      url: redisUrl,
      maxRetriesPerRequest: null as null,
      retryStrategy: (times: number) => {
        console.log(`Redis connection attempt ${times}...`);
        if (times > 20) {
          console.error('Redis unreachable after 20 attempts, exiting');
          process.exit(1);
        }
        return Math.min(times * 1000, 5000);
      },
      lazyConnect: false,
      enableOfflineQueue: true,
    };

    // Dead-letter queue for jobs that exhaust all retries
    const deadLetterQueue = new Queue('asset-tasks-failed', { connection });

    // Initialize media processor
    const mediaProcessor = new MediaProcessor(minioClient, DEFAULT_MINIO_BUCKET);
    await mediaProcessor.ensureTempDir();

    // Create worker with media processing
    const worker = new Worker(
      'asset-tasks',
      async (job) => {
        const { assetId, mimeType, providerPath } = job.data as ProcessMediaJobPayload;
        console.log(
          `Processing job ${job.id} for asset ${assetId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1})`,
        );

        try {
          // Validate required fields — unrecoverable, skip retries
          if (!providerPath || !mimeType) {
            await job.discard();
            throw new Error('Missing required fields: providerPath and mimeType');
          }

          // Update status to PROCESSING
          await Asset.findByIdAndUpdate(assetId, {
            status: AssetStatus.PROCESSING,
            updatedAt: new Date(),
          });
          console.log(`   Status updated to ${AssetStatus.PROCESSING}`);

          // Check if object exists in MinIO with retry
          let fileFound = false;
          const maxAttempts = DEFAULT_MAX_ATTEMPTS;
          const retryDelayMs = DEFAULT_RETRY_DELAY_MS;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              const objStat = await minioClient.statObject(DEFAULT_MINIO_BUCKET, providerPath);
              console.log(`   File found in MinIO (attempt ${attempt}): ${objStat.size} bytes`);
              fileFound = true;
              break;
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : 'Unknown error';
              if (attempt < maxAttempts) {
                console.log(
                  `   Attempt ${attempt}: File not found yet, retrying in ${retryDelayMs}ms...`,
                );
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
              } else {
                console.log(`   File not found in MinIO after ${maxAttempts} attempts: ${errMsg}`);
              }
            }
          }

          if (!fileFound) {
            throw new Error('File not found in MinIO after retries');
          }

          // Process media based on mime type
          let metadata: Record<string, unknown> = {};
          let thumbnailPath: string | undefined;
          let transcodedFiles: unknown[] = [];

          const isImage = mimeType.startsWith('image/');
          const isVideo = mimeType.startsWith('video/');
          const isAudio = mimeType.startsWith('audio/');

          if (isImage) {
            const result = await mediaProcessor.processImage(assetId, providerPath);
            metadata = result.metadata as unknown as Record<string, unknown>;
            thumbnailPath = result.thumbnailPath;
            console.log(`   Image processed with thumbnail`);
          } else if (isVideo) {
            const result = await mediaProcessor.processVideo(assetId, providerPath);
            metadata = result.metadata as unknown as Record<string, unknown>;
            thumbnailPath = result.thumbnailPath;
            transcodedFiles = result.transcodedFiles;
            console.log(`   Video processed: ${transcodedFiles.length} resolutions`);
          } else if (isAudio) {
            const tempPath = await mediaProcessor.downloadFromMinIO(providerPath);
            metadata = (await mediaProcessor.extractVideoMetadata(tempPath)) as unknown as Record<
              string,
              unknown
            >;
            console.log(`   Audio metadata extracted`);
          }

          // Update asset with metadata and processed status
          await Asset.findByIdAndUpdate(assetId, {
            status: AssetStatus.PROCESSED,
            metadata: {
              ...metadata,
              transcoded: transcodedFiles,
            },
            updatedAt: new Date(),
          });

          // Save thumbnail as separate document
          if (thumbnailPath) {
            await Thumbnail.create({
              assetId,
              providerPath: thumbnailPath,
              width: 200,
              height: 200,
            });
            console.log(`   Thumbnail saved for asset ${assetId}`);
          }

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
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

          console.error(`   Job ${job.id} failed (attempt ${job.attemptsMade + 1}): ${errMsg}`);

          // Only mark as FAILED on the last attempt — keep PROCESSING during retries
          if (isLastAttempt) {
            await Asset.findByIdAndUpdate(assetId, {
              status: AssetStatus.FAILED,
              error: errMsg,
              updatedAt: new Date(),
            });
            console.log(`   Asset ${assetId} marked as FAILED after all retries`);
          }

          // Cleanup even on failure
          try {
            await mediaProcessor.cleanup(assetId);
          } catch (cleanupErr) {
            console.warn('Cleanup failed:', cleanupErr);
          }

          throw err;
        }
      },
      {
        connection,
        concurrency: DEFAULT_WORKER_CONCURRENCY, // ← process 3 jobs simultaneously
      },
    );

    // Job completed successfully
    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully (asset: ${job.data.assetId as string})`);
    });

    // Job failed on this attempt (may still retry)
    worker.on('failed', async (job, err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      const attemptsMade = job?.attemptsMade ?? 0;
      const totalAttempts = job?.opts.attempts ?? 1;
      const isLastAttempt = attemptsMade >= totalAttempts - 1;

      console.error(`Job ${job?.id} failed (attempt ${attemptsMade}/${totalAttempts}): ${errMsg}`);

      // Move to dead-letter queue only after all retries exhausted
      if (isLastAttempt && job) {
        console.warn(`🪦 Moving job ${job.id} to dead-letter queue`);
        await deadLetterQueue.add(
          'dead-letter',
          {
            originalJobId: job.id,
            originalQueue: 'asset-tasks',
            payload: job.data,
            error: errMsg,
            failedAt: new Date().toISOString(),
            attemptsMade,
          },
          {
            attempts: 1,
            removeOnFail: false, // keep dead-letter jobs forever for inspection
          },
        );
      }
    });

    // Job stalled — BullMQ will retry automatically
    worker.on('stalled', (jobId) => {
      console.warn(`Job ${jobId} stalled — will be retried automatically`);
    });

    // Queue-level events for deeper observability
    const queueEvents = new QueueEvents('asset-tasks', { connection });

    queueEvents.on('waiting', ({ jobId }) => {
      console.log(`Job ${jobId} waiting in queue`);
    });

    queueEvents.on('active', ({ jobId, prev }) => {
      console.log(`Job ${jobId} is now active (prev: ${prev})`);
    });

    // All retries exhausted — hook your alerting here
    queueEvents.on('retries-exhausted', ({ jobId, attemptsMade }) => {
      console.error(`Job ${jobId} exhausted all retries after ${attemptsMade} attempts`);
      // TODO: wire up Slack / PagerDuty / email alert here
      // await sendAlert({ jobId, reason: failedReason });
    });

    console.log('Media Worker Ready - Watch Mode Enabled - Listening for jobs...');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      await worker.close();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('Worker init error:', errMsg);
    process.exit(1);
  }
}

// Start the worker
startWorker().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
