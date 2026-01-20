# 🏗️ Architecture Diagram & Data Flow

## Complete Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                            │
│  POST /api/upload (File Upload with Base64 Data)            │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│            index.ts - Route Registration                      │
│  app.use('/api/upload', uploadRouter);                        │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│      ROUTES LAYER (upload-routes.ts)                          │
│                                                              │
│  router.post('/', uploadFile);   ◄── Matched route           │
│  router.get('/url', getUploadUrl);                           │
│  router.post('/finalize', finalizeUpload);                   │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼ Calls Handler
┌──────────────────────────────────────────────────────────────┐
│  CONTROLLER LAYER (upload-controller.ts - uploadFile)        │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Extract data from request                        │   │
│  │    - originalName, mimeType, data (base64)         │   │
│  │                                                     │   │
│  │ 2. Validate HTTP input                             │   │
│  │    - Check required fields                         │   │
│  │    - Get AssetService from app.locals             │   │
│  │                                                     │   │
│  │ 3. Call Service Method                             │   │
│  │    await assetService.uploadToMinIO(...)          │   │
│  │    const asset = await assetService.createAsset..│   │
│  │    const jobId = await assetService.queueAsset..  │   │
│  │                                                     │   │
│  │ 4. Format Response                                 │   │
│  │    res.json({ success: true, data: {...} })       │   │
│  │                                                     │   │
│  │ 5. Error Handling                                  │   │
│  │    catch(err) → 500 with error message             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬──────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    MinIO Upload    DB Insert       Queue Job
         │                │                │
         ▼                │                ▼
┌──────────────────┐      │         sends to BullMQ
│ SERVICE LAYER    │      │           (async)
│                  │      │
│uploadToMinIO():  │      │
│  1. Convert      │      │
│     base64→buf   │      │
│  2. Upload to    │      │
│     MinIO        │      │
│  3. Log result   │      │
│  4. Return size  │      │
└──────────────────┘      │
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │                                        │
         │  SERVICE LAYER (asset-service.ts)     │
         │                                        │
         │  createAsset(data):                    │
         │    Call repository.create(data)       │
         │                                        │
         │  queueAssetForProcessing(...):        │
         │    Create BullMQ job                  │
         │    Return job.id                      │
         │                                        │
         └────────────────┬───────────────────────┘
                          │
                          │ Calls Data Layer
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │                                        │
         │  REPOSITORY LAYER                      │
         │  (asset-repository.ts)                │
         │                                        │
         │  create(data):                         │
         │    const asset =                       │
         │      await assetModel.create({         │
         │        filename,                       │
         │        originalName,                   │
         │        mimeType,                       │
         │        size,                           │
         │        status: PENDING                 │
         │      })                                │
         │    return asset.toObject()             │
         │                                        │
         └────────────────┬───────────────────────┘
                          │
                          │ Mongoose ORM
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │         MONGODB DATABASE               │
         │                                        │
         │  Insert into: db.assets               │
         │  {                                     │
         │    _id: ObjectId,                      │
         │    filename: "uploads/...",           │
         │    originalName: "file.pdf",          │
         │    mimeType: "application/pdf",       │
         │    size: 2048,                         │
         │    status: "PENDING",                 │
         │    createdAt: <timestamp>,            │
         │    updatedAt: <timestamp>             │
         │  }                                     │
         │                                        │
         └────────────────────────────────────────┘
```

## Parallel Operations

```
┌─────────────────────────┐
│  Controller receives    │
│  upload request         │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
┌─────────┐   ┌──────────┐
│ MinIO   │   │ MongoDB  │   (Parallel)
│ Upload  │   │ Insert   │
└────┬────┘   └────┬─────┘
     │             │
     ├─────────────┤
     │             │
     ▼             ▼
┌──────────────────────────────┐
│  Service completes all       │
│  operations                  │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Queue Job for Processing    │
│  (BullMQ) - Async            │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│  Return Success Response     │
│  to Client                   │
└──────────────────────────────┘
```

## Layer Responsibilities

```
┌─────────────────────────────────────────────────────────┐
│                    ROUTES LAYER                         │
│  ├─ Define HTTP endpoints                               │
│  ├─ Mount middleware (multer, etc)                      │
│  ├─ Register controller handlers                        │
│  ├─ Handle route conflicts                              │
│  └─ Document endpoints                                  │
└─────────────────────────────────────────────────────────┘
                         │
         Responsibility: ENDPOINT MAPPING
                         │
┌─────────────────────────────────────────────────────────┐
│               CONTROLLER LAYER                          │
│  ├─ Extract req.params, req.query, req.body            │
│  ├─ Validate HTTP input                                 │
│  ├─ Call service methods                                │
│  ├─ Format HTTP responses                               │
│  ├─ Set proper status codes                             │
│  └─ Catch and format errors                             │
└─────────────────────────────────────────────────────────┘
                         │
      Responsibility: HTTP HANDLING
                         │
┌─────────────────────────────────────────────────────────┐
│               SERVICE LAYER                             │
│  ├─ Business logic validation                           │
│  ├─ Orchestrate multiple operations                     │
│  ├─ Handle external services (MinIO, Redis)            │
│  ├─ Transform data for repository                       │
│  ├─ Transform repository results                        │
│  └─ Throw meaningful errors                             │
└─────────────────────────────────────────────────────────┘
                         │
    Responsibility: BUSINESS LOGIC
                         │
┌─────────────────────────────────────────────────────────┐
│              REPOSITORY LAYER                           │
│  ├─ Create records                                      │
│  ├─ Read records                                        │
│  ├─ Update records                                      │
│  ├─ Delete records                                      │
│  ├─ Query with filters                                  │
│  └─ Pagination                                          │
└─────────────────────────────────────────────────────────┘
                         │
       Responsibility: DATA ACCESS
                         │
┌─────────────────────────────────────────────────────────┐
│              MONGOOSE / MONGODB                         │
│  ├─ ORM mapping                                         │
│  ├─ Schema validation                                   │
│  ├─ Database operations                                 │
│  └─ Query execution                                     │
└─────────────────────────────────────────────────────────┘
```

## Upload Workflow

```
User File
  │
  ▼
Convert to Base64
  │
  ▼
Send HTTP POST /api/upload
{
  originalName: "document.pdf",
  mimeType: "application/pdf",
  data: "base64_encoded_content"
}
  │
  ▼
CONTROLLER (uploadFile)
  ├─ Validate input ✓
  └─ Call Service
       │
       ▼
    SERVICE
    ├─ uploadToMinIO()
    │  ├─ Buffer.from(base64)
    │  ├─ minioClient.putObject()
    │  └─ Log: "File uploaded"
    │
    ├─ createAsset()
    │  ├─ Call repository.create()
    │  └─ Return IAsset
    │
    └─ queueAssetForProcessing()
       ├─ Create job payload
       ├─ assetQueue.add()
       └─ Return job.id
       │
       ▼
    REPOSITORY (create)
       ├─ assetModel.create()
       ├─ Save to MongoDB
       └─ Return asset
       │
       ▼
    DATABASE
       └─ Insert asset document
            │
            ▼
RESPONSE
{
  success: true,
  data: {
    assetId: "...",
    objectName: "uploads/...",
    jobId: "...",
    filename: "document.pdf",
    size: 2048,
    status: "PENDING"
  }
}
```

## Error Handling Flow

```
REQUEST
  │
  ▼
CONTROLLER
  ├─ try
  │  └─ Call service
  │
  └─ catch (error)
     └─ Check error message
        ├─ "not found" → 404
        ├─ "required" → 400
        ├─ "not allowed" → 403
        └─ other → 500
           │
           ▼
        FORMAT ERROR
        {
          success: false,
          error: "User message",
          details: "Debug info"
        }
           │
           ▼
        SEND RESPONSE
        res.status(statusCode).json(error)
```

## Dependency Injection

```
index.ts
├─ Create AssetModel
├─ Create AssetRepository(AssetModel)
│        │
│        └─ Repository depends on Model
│
├─ Create AssetService(repository, minioClient, queue)
│        │
│        ├─ Service depends on Repository
│        ├─ Service depends on MinIO
│        └─ Service depends on Queue
│
└─ Store in app.locals
   └─ Controllers access via: app.locals.assetService
```

## Data Model Relationships

```
┌────────────────────────────────────────┐
│          MongoDB Database              │
│                                        │
│  db.assets (collection)               │
│  ┌──────────────────────────────────┐ │
│  │ _id: ObjectId                    │ │
│  │ filename: String (path)          │ │
│  │ originalName: String             │ │
│  │ mimeType: String                 │ │
│  │ size: Number (bytes)             │ │
│  │ status: String (PENDING/...)     │ │
│  │ providerPath: String (MinIO)     │ │
│  │ createdAt: Date                  │ │
│  │ updatedAt: Date                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Points to:                            │
│  MinIO bucket: assets                 │
│  └─ uploads/1234567890-document.pdf   │
│                                        │
│  Job Queue: BullMQ                    │
│  └─ process-media (async processing)  │
└────────────────────────────────────────┘
```

## File Structure Overview

```
src/
│
├── index.ts
│   └─ Express app setup
│   └─ Dependency injection
│   └─ Route mounting
│   └─ Server initialization
│
├── config/
│   └─ config.ts (configuration management)
│
├── routes/
│   ├─ asset-routes.ts
│   │  ├─ GET /api/assets
│   │  ├─ GET /api/assets/stats
│   │  ├─ GET /api/assets/:id
│   │  └─ DELETE /api/assets/:id
│   │
│   └─ upload-routes.ts
│      ├─ POST /api/upload
│      ├─ GET /api/upload/url
│      └─ POST /api/upload/finalize
│
├── controllers/
│   ├─ asset-controller.ts
│   │  ├─ getAssets()
│   │  ├─ getAsset()
│   │  ├─ deleteAsset()
│   │  └─ getStats()
│   │
│   └─ upload-controller.ts
│      ├─ uploadFile()
│      ├─ getUploadUrl()
│      └─ finalizeUpload()
│
├── services/
│   └─ asset-service.ts
│      ├─ createAsset()
│      ├─ getAssetById()
│      ├─ getAllAssets()
│      ├─ uploadToMinIO()
│      ├─ queueAssetForProcessing()
│      └─ ... (business logic)
│
├── repositories/
│   └─ asset-repository.ts
│      ├─ create()
│      ├─ findById()
│      ├─ findAll()
│      ├─ update()
│      ├─ delete()
│      └─ ... (CRUD only)
│
└── types/
    └─ (TypeScript definitions)
```

## Response Format Consistency

```
SUCCESS RESPONSE
┌─────────────────────────────────┐
│ {                               │
│   "success": true,              │
│   "data": {                      │
│     "assetId": "...",           │
│     "objectName": "...",        │
│     ...                          │
│   },                             │
│   "statusCode": 200             │
│ }                               │
└─────────────────────────────────┘

ERROR RESPONSE
┌─────────────────────────────────┐
│ {                               │
│   "success": false,             │
│   "error": "Asset not found",   │
│   "details": "...",             │
│   "statusCode": 404             │
│ }                               │
└─────────────────────────────────┘
```

---

**Every layer has a clear responsibility and data flows predictably through the system!**
