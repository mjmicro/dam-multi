# Repository Pattern Implementation - Complete Guide

## Overview

Your API has been refactored to use a **clean, professional architecture**:

```
Request → Routes → Controllers → Services → Repository → Database
```

## Architecture Pattern

```typescript
┌─────────────────────────────────────────────┐
│         HTTP Request (REST API)              │
├─────────────────────────────────────────────┤
│  Routes Layer (asset-routes.ts)             │
│  - Define endpoints & methods                │
│  - Register controllers                      │
├─────────────────────────────────────────────┤
│  Controller Layer (asset-controller.ts)     │
│  - Extract HTTP request data                │
│  - Validate input parameters                │
│  - Call service methods                     │
│  - Format HTTP responses                    │
├─────────────────────────────────────────────┤
│  Service Layer (asset-service.ts)           │
│  - Business logic & validation              │
│  - Orchestrate operations                   │
│  - Handle file uploads (MinIO)              │
│  - Queue processing jobs (BullMQ)           │
│  - Call repository methods                  │
├─────────────────────────────────────────────┤
│  Repository Layer (asset-repository.ts)    │
│  - CRUD operations ONLY                    │
│  - Database queries (Mongoose)              │
│  - Pure data access logic                   │
├─────────────────────────────────────────────┤
│  MongoDB Database                            │
└─────────────────────────────────────────────┘
```

## Files Structure

```
src/
├── controllers/
│   ├── asset-controller.ts      - Handle GET/DELETE asset requests
│   └── upload-controller.ts     - Handle file upload requests
├── services/
│   └── asset-service.ts         - Business logic (uses repository)
├── repositories/
│   └── asset-repository.ts      - Data access layer
├── routes/
│   ├── asset-routes.ts          - Asset CRUD endpoints
│   ├── upload-routes.ts         - File upload endpoints
│   └── ...
├── config/
│   └── config.ts                - Configuration management
└── index.ts                     - Main entry point
```

## Key Improvements

### ✅ Dependency Injection
```typescript
// Before: Service took Mongoose model directly
new AssetService(AssetModel, minioClient, assetQueue);

// After: Service uses Repository pattern
new AssetService(assetRepository, minioClient, assetQueue);
```

### ✅ Separation of Concerns
- **Repository**: Only database operations
- **Service**: Business logic & external service coordination
- **Controller**: HTTP handling
- **Routes**: Endpoint definitions

### ✅ Testability
Each layer can be tested independently with mocks.

### ✅ Clean API Responses
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed",
  "statusCode": 200
}
```

## API Endpoints

### Asset Management
```bash
# Get all assets (with filters & pagination)
GET /api/assets
GET /api/assets?status=PENDING&page=1&pageSize=10

# Get specific asset
GET /api/assets/:id

# Get asset statistics
GET /api/assets/stats

# Delete asset
DELETE /api/assets/:id
```

### File Upload (3 Methods)

**Method 1: Direct Base64 Upload**
```bash
POST /api/upload
Content-Type: application/json

{
  "originalName": "document.pdf",
  "mimeType": "application/pdf",
  "data": "base64_encoded_file_content"
}

Response:
{
  "success": true,
  "data": {
    "assetId": "...",
    "objectName": "uploads/...",
    "jobId": "...",
    "status": "PENDING"
  }
}
```

**Method 2: Get Presigned URL (for large files)**
```bash
GET /api/upload/url?fileName=document.pdf

Response:
{
  "success": true,
  "data": {
    "url": "https://minio.example.com/...",
    "objectName": "uploads/...",
    "expiresIn": 300
  }
}

# Then PUT file to that URL (directly to MinIO)
PUT <presigned-url>
Content-Type: application/pdf
[file binary data]
```

**Method 3: Finalize Presigned Upload**
```bash
POST /api/finalize
Content-Type: application/json

{
  "objectName": "uploads/...",
  "originalName": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1024000
}

Response:
{
  "success": true,
  "data": {
    "assetId": "...",
    "jobId": "...",
    "status": "PENDING"
  }
}
```

## Usage Examples

### 1. Upload Text File (Base64)
```bash
#!/bin/bash

FILE="document.txt"
BASE64=$(cat "$FILE" | base64)

curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"originalName\": \"$FILE\",
    \"mimeType\": \"text/plain\",
    \"data\": \"$BASE64\"
  }"
```

### 2. Upload Image File
```bash
#!/bin/bash

FILE="image.png"
BASE64=$(cat "$FILE" | base64)

curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{
    \"originalName\": \"$FILE\",
    \"mimeType\": \"image/png\",
    \"data\": \"$BASE64\"
  }"
```

### 3. List Assets with Pagination
```bash
curl "http://localhost:3000/api/assets?page=1&pageSize=10"
```

### 4. Get Asset Details
```bash
curl "http://localhost:3000/api/assets/ASSET_ID"
```

### 5. Get Statistics
```bash
curl "http://localhost:3000/api/assets/stats"
```

### 6. Delete Asset
```bash
curl -X DELETE "http://localhost:3000/api/assets/ASSET_ID"
```

## Testing

### Run the Test Script
```bash
cd /home/manoj/Documents/dam/apps/api
chmod +x test-upload.sh
./test-upload.sh
```

This will test:
- ✓ Health check
- ✓ Asset statistics
- ✓ Get all assets
- ✓ Presigned URL generation
- ✓ File upload (base64)
- ✓ Asset retrieval
- ✓ Pagination
- ✓ Stats after upload

## How Each Layer Works

### 1. Repository Layer
```typescript
// src/repositories/asset-repository.ts
export class AssetRepository {
  async create(data): Promise<IAsset> { /* DB insert */ }
  async findById(id): Promise<IAsset | null> { /* DB query */ }
  async findAll(filters): Promise<IAsset[]> { /* DB filter */ }
  async updateStatus(id, status): Promise<IAsset | null> { /* DB update */ }
  async delete(id): Promise<boolean> { /* DB delete */ }
  async count(): Promise<number> { /* DB count */ }
  async findByStatus(status): Promise<IAsset[]> { /* DB query */ }
  async findPaginated(page, pageSize): Promise<{data, total}> { /* DB pagination */ }
}
```

### 2. Service Layer
```typescript
// src/services/asset-service.ts
export class AssetService {
  constructor(
    private repository: AssetRepository,
    private minioClient: Minio.Client,
    private assetQueue: Queue
  ) {}

  async createAsset(data): Promise<IAsset> {
    // Validate data
    // Call repository.create()
    // Return result
  }

  async uploadToMinIO(bucket, objectName, buffer, metadata): Promise<number> {
    // Upload to MinIO
    // Log success
    // Return file size
  }

  async queueAssetForProcessing(...): Promise<string> {
    // Create BullMQ job
    // Queue for processing
    // Return job ID
  }
}
```

### 3. Controller Layer
```typescript
// src/controllers/asset-controller.ts
export const getAssets = async (req: Request, res: Response) => {
  const assetService: AssetService = req.app.locals.assetService;
  
  try {
    // Validate input
    const { status, mimeType, page, pageSize } = req.query;
    
    // Call service
    const assets = await assetService.getAllAssets({ status, mimeType });
    
    // Format response
    res.json({ success: true, data: assets });
  } catch (err: any) {
    // Handle error with proper status code
    res.status(500).json({ success: false, error: err.message });
  }
};
```

### 4. Routes Layer
```typescript
// src/routes/asset-routes.ts
const assetRouter = express.Router();

assetRouter.get('/stats', getStats);      // Must come first
assetRouter.get('/', getAssets);          // List all
assetRouter.get('/:id', getAsset);        // Get one
assetRouter.delete('/:id', deleteAsset);  // Delete

export default assetRouter;
```

## Initialization Flow

```typescript
// src/index.ts
async function initializeServices() {
  // 1. Connect to MongoDB
  await connectDatabase(config.database.mongoUrl);
  
  // 2. Get Mongoose model
  const AssetModel = getAssetModel(mongoose);
  
  // 3. Create Repository (depends on model)
  const repository = new AssetRepository(AssetModel);
  
  // 4. Initialize MinIO client
  const minioClient = initializeMinIO(config);
  await setupMinioBucket(minioClient, bucketName, region);
  
  // 5. Initialize Redis for BullMQ
  const redisConnection = new IORedis(config.redis.url);
  const assetQueue = new Queue(config.queue.name, { connection: redisConnection });
  
  // 6. Create Service with Repository (Dependency Injection)
  const assetService = new AssetService(repository, minioClient, assetQueue);
  
  // 7. Store in app.locals for controllers to access
  app.locals.assetService = assetService;
  app.locals.minioClient = minioClient;
}
```

## Error Handling

### Status Codes
- `200`: Success
- `201`: Created (upload)
- `202`: Accepted (processing started)
- `400`: Bad request (validation error)
- `404`: Not found
- `500`: Server error
- `503`: Service unavailable

### Error Response Format
```json
{
  "success": false,
  "error": "User-friendly error message",
  "details": "Detailed error info (for debugging)"
}
```

## Adding a New Feature

### 1. Create Repository Method
```typescript
// src/repositories/asset-repository.ts
async findByTag(tag: string): Promise<IAsset[]> {
  return this.assetModel.find({ tags: tag }).lean();
}
```

### 2. Create Service Method
```typescript
// src/services/asset-service.ts
async getAssetsByTag(tag: string): Promise<IAsset[]> {
  // Validate tag
  if (!tag) throw new Error('Tag required');
  // Call repository
  return this.repository.findByTag(tag);
}
```

### 3. Create Controller Method
```typescript
// src/controllers/asset-controller.ts
export const getAssetsByTag = async (req: Request, res: Response) => {
  try {
    const { tag } = req.query;
    if (!tag) return res.status(400).json({ error: 'Tag required' });
    
    const assets = await assetService.getAssetsByTag(tag as string);
    res.json({ success: true, data: assets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};
```

### 4. Add Route
```typescript
// src/routes/asset-routes.ts
assetRouter.get('/by-tag', getAssetsByTag);
```

## Best Practices Applied

✅ **Single Responsibility**: Each class has one reason to change
✅ **Dependency Injection**: Services receive their dependencies
✅ **Separation of Concerns**: HTTP, business logic, and data access are separate
✅ **Consistent Error Handling**: Unified error responses
✅ **Scalability**: Easy to add new features following the pattern
✅ **Testability**: Each layer can be tested independently
✅ **Type Safety**: Full TypeScript typing throughout
✅ **Clean Code**: Clear naming and documentation

## Next Steps

1. **Run the server**
   ```bash
   npm run dev
   ```

2. **Test the API**
   ```bash
   ./test-upload.sh
   ```

3. **Monitor logs**
   ```bash
   docker logs media_api -f
   ```

4. **Add new features** following the pattern
   - Create repository method
   - Create service method
   - Create controller method
   - Add route

## Troubleshooting

### File Upload Fails
- Check MinIO is running: `docker ps | grep minio`
- Check bucket name in config
- Verify file size limit (100MB)

### Asset Not Found
- Verify asset ID exists: `GET /api/assets`
- Check MongoDB connection

### Queue Jobs Not Processing
- Check Redis is running: `docker ps | grep redis`
- Check BullMQ consumer in worker service

## References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
