# Service Architecture - Clean Separation of Concerns

## Overview

Your API now uses **multiple focused services** following the Single Responsibility Principle:

```
Request → Routes → Thin Controller → Appropriate Service → Repository → Database
```

## Services

### 1. **AssetService** - Asset Management
Handles asset-related business logic:
- Create assets
- Fetch assets (by ID, all, by status, paginated)
- Update asset status
- Delete assets
- Queue processing jobs
- File upload to MinIO
- Count and statistics

```typescript
// Responsibilities
async createAsset(data): Promise<IAsset>
async getAssetById(id): Promise<IAsset | null>
async getAllAssets(filters?): Promise<IAsset[]>
async updateAssetStatus(id, status): Promise<IAsset | null>
async deleteAsset(id, minIOObjectName): Promise<boolean>
async queueAssetForProcessing(...): Promise<string>
async uploadToMinIO(...): Promise<number>
async getAssetsByStatus(status): Promise<IAsset[]>
async countAssets(): Promise<number>
async getAssetsPaginated(page, pageSize): Promise<{data, total}>
```

### 2. **UploadService** - File Upload Operations
Dedicated service for file upload handling:
- Base64 file uploads
- Presigned URL generation
- Upload finalization
- File validation (size, type)
- Object name generation
- MinIO file operations

```typescript
// Responsibilities
async uploadFromBase64(request): Promise<UploadResponse>
async getPresignedUploadUrl(fileName): Promise<PresignedUrlResponse>
async finalizePresignedUpload(request): Promise<UploadResponse>
async fileExists(objectName): Promise<boolean>
async deleteFile(objectName): Promise<void>
```

## Architecture Diagram

```
HTTP Requests
     ↓
Routes Layer
├── asset-routes.ts
│   ├── GET /api/assets
│   ├── GET /api/assets/:id
│   ├── GET /api/assets/stats
│   └── DELETE /api/assets/:id
│
└── upload-routes.ts
    ├── POST /api/upload (base64)
    ├── GET /api/upload/url (presigned)
    └── POST /api/upload/finalize
     ↓
Controller Layer (THIN)
├── asset-controller.ts
│   ├── getAssets()      → AssetService
│   ├── getAsset()       → AssetService
│   ├── getStats()       → AssetService
│   └── deleteAsset()    → AssetService
│
└── upload-controller.ts
    ├── uploadFile()     → UploadService
    ├── getUploadUrl()   → UploadService
    └── finalizeUpload() → UploadService
     ↓
Service Layer (BUSINESS LOGIC)
├── AssetService
│   ├── CRUD operations
│   ├── Queuing
│   └── Uses: AssetRepository
│
└── UploadService
    ├── Upload handling
    ├── Validation
    ├── File operations
    └── Uses: AssetService, MinIO
     ↓
Repository Layer (DATA ACCESS)
└── AssetRepository
    ├── find()
    ├── create()
    ├── update()
    └── delete()
     ↓
Database
└── MongoDB
```

## Why Multiple Services?

✅ **Single Responsibility**: Each service has ONE reason to change
✅ **Easy Testing**: Mock upload logic separate from asset logic
✅ **Maintainability**: Changes to upload don't affect asset logic
✅ **Reusability**: UploadService can be used by other features
✅ **Scalability**: Easy to add new specialized services

## Service Dependencies

```
UploadService
├── Uses: MinIOClient
├── Uses: AssetService (for creating asset records)
└── Uses: BullMQ (via AssetService)

AssetService
├── Uses: AssetRepository (for data access)
├── Uses: MinIOClient (for file operations)
└── Uses: BullMQ (for queuing)

AssetRepository
└── Uses: Mongoose Model (for DB access)
```

## Controller Responsibilities (THIN)

Controllers now only handle HTTP concerns:

```typescript
export const uploadFile = async (req: Request, res: Response) => {
  // 1. Extract data from HTTP request
  const { originalName, mimeType, data } = req.body;

  // 2. Validate HTTP input (required fields)
  if (!originalName || !mimeType || !data) {
    return res.status(400).json({ error: '...' });
  }

  try {
    // 3. Delegate to service (ALL business logic)
    const result = await uploadService.uploadFromBase64({
      originalName,
      mimeType,
      data,
    });

    // 4. Format HTTP response
    res.status(201).json({
      success: true,
      message: 'File uploaded',
      data: result,
    });
  } catch (err) {
    // 5. Handle HTTP errors
    res.status(500).json({ error: err.message });
  }
};
```

**What controllers DON'T do:**
- ❌ Validate business logic
- ❌ Handle file operations
- ❌ Access database directly
- ❌ Create jobs
- ❌ Check file types

All that goes to services!

## Service Separation Example

### Upload Base64 File

**Controller (5 lines of logic):**
```typescript
const result = await uploadService.uploadFromBase64(req.body);
res.status(201).json({ success: true, data: result });
```

**UploadService (handles everything):**
```typescript
async uploadFromBase64(request: UploadRequest): Promise<UploadResponse> {
  this.validateUploadRequest(request);           // Validate input
  const buffer = Buffer.from(request.data, 'base64');
  this.validateFileSize(buffer.length);          // Check size
  const objectName = this.generateObjectName(...);
  await this.uploadToMinIO(...);                 // Upload to MinIO
  const asset = await this.assetService.createAsset(...);  // Create record
  const jobId = await this.assetService.queueAssetForProcessing(...);  // Queue
  return { assetId, objectName, jobId, ... };   // Return result
}
```

## How to Add a New Service

### Example: Create VideoTranscodeService

```typescript
// 1. Create src/services/video-transcode-service.ts
export class VideoTranscodeService {
  constructor(
    private minioClient: Minio.Client,
    private transcodeQueue: Queue
  ) {}

  async queueTranscode(assetId: string, format: string): Promise<string> {
    // Queue video transcoding job
    const job = await this.transcodeQueue.add(
      'transcode-video',
      { assetId, format },
      { attempts: 3 }
    );
    return job.id;
  }

  async getTranscodeStatus(jobId: string): Promise<any> {
    // Get job status
  }
}

// 2. Initialize in index.ts
const videoTranscodeService = new VideoTranscodeService(minioClient, transcodeQueue);
app.locals.videoTranscodeService = videoTranscodeService;

// 3. Create controller
export const queueTranscode = async (req: Request, res: Response) => {
  const service = req.app.locals.videoTranscodeService;
  const jobId = await service.queueTranscode(req.body.assetId, req.body.format);
  res.json({ success: true, jobId });
};

// 4. Add routes
router.post('/videos/:id/transcode', queueTranscode);
```

## Testing Each Service

### Test UploadService
```typescript
describe('UploadService', () => {
  let uploadService: UploadService;
  let minioMock: MockMinioClient;
  let assetServiceMock: MockAssetService;

  beforeEach(() => {
    minioMock = new MockMinioClient();
    assetServiceMock = new MockAssetService();
    uploadService = new UploadService(minioMock, assetServiceMock);
  });

  it('should validate file type', async () => {
    const result = uploadService.uploadFromBase64({
      originalName: 'script.exe',
      mimeType: 'application/x-msdownload',
      data: 'base64data',
    });
    expect(result).rejects.toThrow('not allowed');
  });

  it('should validate file size', async () => {
    const result = uploadService.uploadFromBase64({
      originalName: 'huge.bin',
      mimeType: 'application/octet-stream',
      data: 'huge base64 data > 100MB',
    });
    expect(result).rejects.toThrow('exceeds maximum');
  });
});
```

## Request Flow Example

**User uploads a file:**

```
1. User POST /api/upload with base64 file
   ↓
2. upload-controller.ts extracts { originalName, mimeType, data }
   ↓
3. Controller calls: uploadService.uploadFromBase64(request)
   ↓
4. UploadService:
   ├─ Validates request (name, type, data present)
   ├─ Converts base64 to Buffer
   ├─ Validates file size (≤ 100MB)
   ├─ Validates MIME type (whitelist)
   ├─ Generates unique object name
   ├─ Uploads to MinIO
   ├─ Calls AssetService.createAsset() to create DB record
   ├─ Calls AssetService.queueAssetForProcessing() for job
   └─ Returns { assetId, objectName, jobId, ... }
   ↓
5. Controller returns 201 with result
   ↓
6. User receives: { success: true, data: { ... } }
   ↓
7. Worker processes the job in background
```

## Service Configuration

```typescript
// In index.ts - Dependency Injection
const assetRepository = new AssetRepository(AssetModel);
const assetService = new AssetService(assetRepository, minioClient, assetQueue);
const uploadService = new UploadService(minioClient, assetService, bucketName);

// Store in app.locals
app.locals.assetService = assetService;
app.locals.uploadService = uploadService;
```

## Error Handling in Services

```typescript
// UploadService validates and throws meaningful errors
try {
  this.validateUploadRequest(request);  // Throws if invalid
  this.validateFileSize(size);           // Throws if too large
} catch (error) {
  throw new Error(`Validation failed: ${error.message}`);
}

// Controller catches and maps to HTTP status
catch (err: any) {
  const statusCode = err.message.includes('not allowed') ? 400 : 500;
  res.status(statusCode).json({ error: err.message });
}
```

## Benefits of This Architecture

| Aspect | Before | After |
|--------|--------|-------|
| **Controller Size** | Large, mixed concerns | Small, HTTP only |
| **Service Reuse** | Limited | Easy - inject anywhere |
| **Testing** | Hard - everything intertwined | Easy - mock dependencies |
| **Scalability** | Adding features is complex | Simple - add new service |
| **Maintenance** | Changes affect multiple areas | Changes localized |
| **Type Safety** | Partial | Full TypeScript |

## File Structure Summary

```
src/
├── controllers/
│   ├── asset-controller.ts      (50 lines - HTTP only)
│   └── upload-controller.ts     (60 lines - HTTP only)
│
├── services/
│   ├── asset-service.ts         (150 lines - asset logic)
│   └── upload-service.ts        (180 lines - upload logic)
│
├── repositories/
│   └── asset-repository.ts      (80 lines - data access)
│
├── routes/
│   ├── asset-routes.ts          (Clean route definitions)
│   └── upload-routes.ts         (Clean route definitions)
│
└── index.ts                     (Initialization + health check)
```

Total: Clean, organized, maintainable code!
