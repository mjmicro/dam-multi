import 'dotenv/config';
import express from 'express';
import * as Minio from 'minio';
import { Queue } from 'bullmq';
import { getAssetModel, getThumbnailModel, getVideoRenditionModel, connectDb } from '@dam/database';
import { corsMiddleware } from './middleware/cors';
import { getConfig } from './config/config';
import { AssetService } from './services/asset-service';
import { AssetRepository } from './repositories/asset-repository';
import { UploadService } from './services/upload-service';
import { TagService } from './features/tags/tag-service';
import { ThumbnailService } from './features/thumbnails/thumbnail-service';
import assetRouter from './routes/asset-routes';
import uploadRouter from './routes/upload-routes';
import healthRouter from './routes/health-routes';

// const DEFAULT_JOB_ATTEMPTS = 3;
// const DEFAULT_JOB_BACKOFF_DELAY = 2000;
console.log('[API index.ts] Loading...');

// Trigger nodemon reload v4
const app = express();
const config = getConfig();

// Middleware: CORS & Body parsing
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/assets', assetRouter);
app.use('/api/upload', uploadRouter);

// Bootstrap: Initialize all services
(async () => {
  try {
    console.log(`[STARTUP] Starting up...`);

    console.log(`[STARTUP] About to wait for MongoDB connection...`);
    try {
      // Wait for MongoDB connection initiated by database module on import
      await connectDb(config.database.mongoUrl);
      console.log('MongoDB connected');
    } catch (dbErr) {
      console.error(`[STARTUP] Database connection error:`, dbErr);
      throw dbErr;
    }

    // Initialize repository & services
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AssetModel: any = getAssetModel();
    const assetRepository = new AssetRepository(AssetModel);
    console.log('AssetRepository initialized');

    // MinIO setup
    const minioClient = new Minio.Client({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
    app.locals.minioClient = minioClient;

    const bucketExists = await minioClient.bucketExists(config.minio.bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(config.minio.bucketName, config.minio.region);
      console.log(`MinIO bucket "${config.minio.bucketName}" created`);
    } else {
      console.log(`MinIO bucket "${config.minio.bucketName}" exists`);
    }

    // Redis & BullMQ setup
    const connection = {
      url: config.redis.url,
      maxRetriesPerRequest: config.redis.retryPolicy.maxRetriesPerRequest,
    };
    const assetQueue = new Queue(config.queue.name, { connection });

    // Service initialization
    const VideoRenditionModel = getVideoRenditionModel();
    const assetService = new AssetService(
      assetRepository,
      minioClient,
      assetQueue,
      config.minio.externalUrl,
      VideoRenditionModel,
    );
    app.locals.assetService = assetService;

    const uploadService = new UploadService(minioClient, assetService, config.minio.bucketName);
    app.locals.uploadService = uploadService;

    const tagService = new TagService(assetRepository);
    app.locals.tagService = tagService;

    const ThumbnailModel = getThumbnailModel();
    const thumbnailService = new ThumbnailService(
      ThumbnailModel,
      minioClient,
      config.minio.externalUrl,
    );
    app.locals.thumbnailService = thumbnailService;

    console.log('Services initialized');

    // Start server
    app.listen(config.app.port, () => {
      console.log(`API Server Ready - http://127.0.0.1:${config.app.port}`);
      console.log(`Environment: ${config.app.env}`);
    });
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
