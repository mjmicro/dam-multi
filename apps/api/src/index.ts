import 'dotenv/config';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as Minio from 'minio';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  getAssetModel,
} from '@dam/database';
import { AssetService } from './services/asset-service';
import { AssetRepository } from './repositories/asset-repository';
import { UploadService } from './services/upload-service';
import { getConfig } from './config/config';
import assetRouter from './routes/asset-routes';
import uploadRouter from './routes/upload-routes';

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Module-level state
let assetService: AssetService | null = null;
let assetRepository: AssetRepository | null = null;
let uploadService: UploadService | null = null;
let minioClient: Minio.Client | null = null;

/**
 * Initialize MinIO client
 */
function initializeMinIO(config: ReturnType<typeof getConfig>): Minio.Client {
  return new Minio.Client({
    endPoint: config.minio.endpoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });
}

/**
 * Initialize and setup MinIO bucket
 */
async function setupMinioBucket(
  client: Minio.Client,
  bucketName: string,
  region: string
): Promise<void> {
  try {
    const bucketExists = await client.bucketExists(bucketName);
    if (!bucketExists) {
      await client.makeBucket(bucketName, region);
      console.log(`✅ MinIO bucket "${bucketName}" created`);
    } else {
      console.log(`✅ MinIO bucket "${bucketName}" exists`);
    }
  } catch (err: any) {
    console.error('⚠️ MinIO bucket setup failed:', err.message);
    throw err;
  }
}

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    const config = getConfig();

    // Connect to MongoDB
    await connectDatabase(config.database.mongoUrl);
    console.log('✅ MongoDB connected');

    // Get Asset model
    const AssetModel = getAssetModel(mongoose);

    // Initialize Repository
    assetRepository = new AssetRepository(AssetModel);
    console.log('✅ AssetRepository initialized');

    // Initialize MinIO client
    minioClient = initializeMinIO(config);
    app.locals.minioClient = minioClient;
    await setupMinioBucket(
      minioClient,
      config.minio.bucketName,
      config.minio.region
    );

    // Initialize Redis connection for BullMQ
    const redisConnection = new IORedis(config.redis.url, {
      maxRetriesPerRequest: config.redis.retryPolicy.maxRetriesPerRequest,
    });
    const assetQueue = new Queue(config.queue.name, {
      connection: redisConnection,
    });

    // Initialize service with repository (dependency injection)
    assetService = new AssetService(assetRepository, minioClient, assetQueue);
    app.locals.assetService = assetService;

    // Initialize upload service with asset service dependency
    uploadService = new UploadService(minioClient, assetService, config.minio.bucketName);
    app.locals.uploadService = uploadService;

    console.log('✅ AssetService initialized with Repository pattern');
    console.log('✅ UploadService initialized for file uploads');
  } catch (err: any) {
    console.error('❌ Initialization failed:', err.message);
    process.exit(1);
  }
}

/**
 * Start application
 */
async function startApplication(): Promise<void> {
  try {
    await initializeServices();

    const config = getConfig();
    const PORT = config.app.port;

    app.listen(PORT, () => {
      console.log(`🚀 API Server Ready - Watch Mode Test Build - http://localhost:${PORT}`);
      console.log(`Environment: ${config.app.env}`);
    });
  } catch (err: any) {
    console.error('Failed to start application:', err.message);
    process.exit(1);
  }
}

// ============ ROUTES ============

/**
 * Health check endpoint
 */
app.get('/health', async (req: Request, res: Response) => {
  const dbOk = mongoose.connection.readyState === 1;
  const serviceOk = assetService !== null;

  res.json({
    ok: true,
    db: dbOk,
    service: serviceOk,
  });
});

/**
 * API Endpoints - Clean routing structure
 */
app.use('/api/assets', assetRouter);
app.use('/api/upload', uploadRouter);

// Start the application
startApplication().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
