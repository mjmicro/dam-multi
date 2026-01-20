# Quick Start Testing Guide

## Prerequisites
- API running: `npm run dev` (in apps/api)
- MinIO running: `docker compose up` 
- Redis running: already in docker-compose
- MongoDB running: already in docker-compose

## Quick Commands

### 1. Check API Health
```bash
curl http://localhost:3000/health
```

### 2. Get Asset Statistics
```bash
curl http://localhost:3000/api/assets/stats
```

### 3. Upload a Test File
```bash
# Create test file
echo "This is test content $(date)" > test.txt

# Convert to base64
BASE64=$(cat test.txt | base64 -w0)

# Upload
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{\"originalName\":\"test.txt\",\"mimeType\":\"text/plain\",\"data\":\"$BASE64\"}"

# Response will include assetId - save it!
```

### 4. Get Uploaded Asset
```bash
curl http://localhost:3000/api/assets/ASSET_ID_HERE
```

### 5. List All Assets
```bash
curl http://localhost:3000/api/assets
```

### 6. List with Pagination
```bash
curl "http://localhost:3000/api/assets?page=1&pageSize=10"
```

### 7. Delete Asset
```bash
curl -X DELETE http://localhost:3000/api/assets/ASSET_ID_HERE
```

## Automated Test Script

```bash
# Make executable
chmod +x ./test-upload.sh

# Run tests
./test-upload.sh
```

This runs comprehensive tests including:
- ✓ Health check
- ✓ Statistics
- ✓ List assets  
- ✓ Presigned URL
- ✓ Base64 upload
- ✓ Asset retrieval
- ✓ Pagination
- ✓ Final stats

## What Was Refactored

### Before ❌
```
index.ts (404 lines)
├── All routes inline
├── All controllers inline
├── All services directly handling DB
└── No clear separation
```

### After ✅
```
Clean Architecture Pattern
├── routes/ (endpoint definitions)
├── controllers/ (HTTP handlers)
├── services/ (business logic)
├── repositories/ (data access)
└── types/ (TypeScript definitions)
```

## File Structure

```
src/
├── controllers/
│   ├── asset-controller.ts       ← GET/DELETE assets
│   └── upload-controller.ts      ← File upload handlers
│
├── services/
│   └── asset-service.ts          ← Business logic (uses repository)
│
├── repositories/
│   └── asset-repository.ts       ← Database access only
│
├── routes/
│   ├── asset-routes.ts           ← Asset CRUD endpoints
│   └── upload-routes.ts          ← Upload endpoints
│
├── config/
│   └── config.ts                 ← Configuration
│
└── index.ts                      ← Main server (cleaned up)
```

## Architecture Layers

```
HTTP Request
    ↓
Routes (asset-routes.ts)
    ↓
Controller (asset-controller.ts) - Handles HTTP
    ↓
Service (asset-service.ts) - Business logic
    ↓
Repository (asset-repository.ts) - Database
    ↓
MongoDB
```

## Key Benefits

✅ **Clean Code**: Easy to understand and maintain
✅ **Testable**: Each layer can be mocked independently  
✅ **Scalable**: Easy to add new features
✅ **Professional**: Follows industry best practices
✅ **Type-Safe**: Full TypeScript support
✅ **Error Handling**: Consistent error responses

## Common Issues & Solutions

### "Service not initialized"
- Ensure Docker containers are running
- Check MongoDB connection
- Verify MinIO is accessible

### "Cannot POST /api/upload"
- Route might not be registered
- Check: `app.use('/api/upload', uploadRouter)`

### "Asset not found"
- Double-check asset ID
- Test: `curl http://localhost:3000/api/assets`

### File upload hangs
- Check file size (max 100MB)
- Check MinIO logs: `docker logs minio`

## Next: Add Your Own Feature

### Example: Add "Archive Asset" Feature

1. **Repository** - Add method to mark archived
```typescript
async archive(id: string): Promise<IAsset | null> {
  return this.assetModel.findByIdAndUpdate(id, 
    { status: AssetStatus.ARCHIVED }, 
    { new: true }
  );
}
```

2. **Service** - Add validation
```typescript
async archiveAsset(id: string): Promise<IAsset> {
  const asset = await this.getAssetById(id);
  if (!asset) throw new Error('Not found');
  return this.repository.archive(id);
}
```

3. **Controller** - Handle HTTP
```typescript
export const archiveAsset = async (req: Request, res: Response) => {
  try {
    const asset = await assetService.archiveAsset(req.params.id);
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
```

4. **Routes** - Add endpoint
```typescript
assetRouter.put('/:id/archive', archiveAsset);
```

Done! Now: `PUT /api/assets/:id/archive`

## Testing Different File Types

```bash
# Text file
echo "Hello World" > test.txt
BASE64=$(cat test.txt | base64 -w0)
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{\"originalName\":\"test.txt\",\"mimeType\":\"text/plain\",\"data\":\"$BASE64\"}"

# JSON file  
echo '{"test":"data"}' > test.json
BASE64=$(cat test.json | base64 -w0)
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d "{\"originalName\":\"test.json\",\"mimeType\":\"application/json\",\"data\":\"$BASE64\"}"
```

## Monitoring

### View API logs
```bash
docker logs media_api -f
```

### Check MinIO
```bash
# List buckets
docker exec minio mc ls minio

# List files in bucket
docker exec minio mc ls minio/assets
```

### Check MongoDB
```bash
# Connect to mongo
docker exec -it mongo mongosh

# Use DAM database
use dam

# List assets
db.assets.find().pretty()
```

## Summary

Your API now follows professional architecture patterns:

- **Repository**: Database operations
- **Service**: Business logic  
- **Controller**: HTTP handling
- **Routes**: Endpoint definitions
- **File Upload**: ✓ Working
- **Pagination**: ✓ Working
- **Error Handling**: ✓ Improved
- **Type Safety**: ✓ Full TypeScript
- **Testing**: ✓ Ready

Run `./test-upload.sh` to verify everything works!
