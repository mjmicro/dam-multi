import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import * as Minio from 'minio';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getAssetModel, connectDB as connectDatabase } from '@dam/database';
import { corsMiddleware } from './middleware/cors';
import { getConfig } from './config/config';
import { AssetService } from './services/asset-service';
import { AssetRepository } from './repositories/asset-repository';
import { UploadService } from './services/upload-service';
import assetRouter from './routes/asset-routes';
import uploadRouter from './routes/upload-routes';

const app = express();
const config = getConfig();

// Middleware: CORS & Body parsing
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/assets', assetRouter);
app.use('/api/upload', uploadRouter);

// Bootstrap: Initialize all services
(async () => {
  try {
    // Connect DB
    await connectDatabase(config.database.mongoUrl);
    console.log('✅ MongoDB connected');

    // Initialize repository & services
    const AssetModel = getAssetModel(mongoose);
    const assetRepository = new AssetRepository(AssetModel);
    console.log('✅ AssetRepository initialized');

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
      console.log(`✅ MinIO bucket "${config.minio.bucketName}" created`);
    } else {
      console.log(`✅ MinIO bucket "${config.minio.bucketName}" exists`);
    }

    // Redis & BullMQ setup
    const redisConnection = new IORedis(config.redis.url, {
      maxRetriesPerRequest: config.redis.retryPolicy.maxRetriesPerRequest,
    });
    const assetQueue = new Queue(config.queue.name, { connection: redisConnection });

    // Service initialization
    const assetService = new AssetService(assetRepository, minioClient, assetQueue);
    app.locals.assetService = assetService;

    const uploadService = new UploadService(minioClient, assetService, config.minio.bucketName);
    app.locals.uploadService = uploadService;

    console.log('✅ Services initialized');

    // Start server
    app.listen(config.app.port, () => {
      console.log(`🚀 API Server Ready - http://localhost:${config.app.port}`);
      console.log(`Environment: ${config.app.env}`);
    });
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
})();
