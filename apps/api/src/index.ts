import 'dotenv/config';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as Minio from 'minio';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  getAssetModel,
  CreateAssetDTO,
  AssetStatus,
  connectDB as connectDatabase,
} from '@dam/database';
import { AssetService } from './services/AssetService';
import { getConfig } from './config/config';

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

    // Initialize MinIO client
    minioClient = initializeMinIO(config);
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

    // Initialize service after everything is ready
    assetService = new AssetService(AssetModel, minioClient, assetQueue);
    console.log('✅ AssetService initialized');
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
 * Get all assets with optional filters
 */
app.get('/api/assets', async (req: Request, res: Response) => {
  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { status, mimeType } = req.query;
    const assets = await assetService.getAllAssets({
      status: status as AssetStatus | undefined,
      mimeType: mimeType as string | undefined,
    });

    res.json(assets);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch assets', details: err.message });
  }
});

/**
 * Get single asset by ID
 */
app.get('/api/assets/:id', async (req: Request, res: Response) => {
  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const asset = await assetService.getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch asset', details: err.message });
  }
});

/**
 * Upload file directly with base64 data
 */
app.post('/api/upload', async (req: Request, res: Response) => {
  const { originalName, mimeType, data } = req.body;

  if (!originalName || !data) {
    return res
      .status(400)
      .json({ error: 'originalName and data (base64) required' });
  }

  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const objectName = `uploads/${Date.now()}-${originalName}`;
    const buffer = Buffer.from(data, 'base64');

    // Upload file to MinIO using service
    await assetService.uploadToMinIO('assets', objectName, buffer, {
      'Content-Type': mimeType || 'application/octet-stream',
    });

    console.log(
      `✅ File uploaded to MinIO: ${objectName} (${buffer.length} bytes)`
    );

    // Create asset record using service
    const assetData: CreateAssetDTO = {
      filename: objectName,
      originalName,
      mimeType: mimeType || 'application/octet-stream',
      size: buffer.length,
      providerPath: objectName,
    };

    const asset = await assetService.createAsset(assetData);

    // Queue processing job using service
    const jobId = await assetService.queueAssetForProcessing(
      (asset._id as string).toString(),
      originalName,
      mimeType || 'application/octet-stream',
      objectName
    );

    res.status(201).json({
      message: 'File uploaded and processing started',
      assetId: asset._id,
      objectName,
      jobId,
    });
  } catch (err: any) {
    console.error('❌ Upload failed:', err.message);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

/**
 * Get presigned upload URL from MinIO
 */
app.get('/api/upload-url', async (req: Request, res: Response) => {
  const { fileName } = req.query;
  const config = getConfig();

  if (!fileName) {
    return res.status(400).json({ error: 'fileName query parameter required' });
  }

  const objectName = `uploads/${Date.now()}-${fileName}`;

  try {
    if (!minioClient) {
      return res.status(503).json({ error: 'MinIO client not initialized' });
    }

    const url = await minioClient.presignedPutObject(
      config.minio.bucketName,
      objectName,
      60 * 5 // 5 minutes
    );
    const externalUrl = url.replace(
      `http://${config.minio.endpoint}:${config.minio.port}`,
      config.minio.externalUrl
    );

    res.json({ url: externalUrl, objectName });
  } catch (err: any) {
    console.error('❌ Presigned URL generation failed:', err.message);
    res.status(500).json({
      error: 'Failed to generate URL',
      details: err.message,
    });
  }
});

/**
 * Finalize upload after presigned upload
 */
app.post('/api/finalize', async (req: Request, res: Response) => {
  const { objectName, originalName, mimeType, size } = req.body;

  if (!objectName || !originalName || !mimeType || !size) {
    return res.status(400).json({
      error: 'objectName, originalName, mimeType, and size are required',
    });
  }

  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const assetData: CreateAssetDTO = {
      filename: objectName,
      originalName,
      mimeType,
      size,
      providerPath: objectName,
    };

    const asset = await assetService.createAsset(assetData);
    const jobId = await assetService.queueAssetForProcessing(
      (asset._id as string).toString(),
      originalName,
      mimeType,
      objectName
    );

    res.status(202).json({
      message: 'Processing started',
      assetId: asset._id,
      jobId,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Database or Queue error',
      details: err.message,
    });
  }
});

/**
 * Delete asset by ID
 */
app.delete('/api/assets/:id', async (req: Request, res: Response) => {
  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const asset = await assetService.getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const success = await assetService.deleteAsset(req.params.id, asset.filename);

    if (success) {
      res.json({ message: 'Asset deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/**
 * Get asset statistics
 */
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const total = await assetService.countAssets();
    const pending = await assetService.getAssetsByStatus(AssetStatus.PENDING);
    const processed = await assetService.getAssetsByStatus(
      AssetStatus.PROCESSED
    );
    const failed = await assetService.getAssetsByStatus(AssetStatus.FAILED);

    res.json({
      total,
      pending: pending.length,
      processed: processed.length,
      failed: failed.length,
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: 'Failed to fetch stats', details: err.message });
  }
});

// Start the application
startApplication().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
