/**
 * Upload Routes - File upload endpoints
 * Pattern: /api/upload*
 */

import express from 'express';
import { uploadFile, getUploadUrl, finalizeUpload } from '../controllers/upload-controller';

const uploadRouter = express.Router();

/**
 * POST /api/upload - Upload file with base64 data
 * Body: { originalName, mimeType, data: string (base64) }
 */
uploadRouter.post('/', uploadFile);

/**
 * GET /api/upload-url - Get presigned URL for direct MinIO upload
 * Query: fileName (required)
 */
uploadRouter.get('/url', getUploadUrl);

/**
 * POST /api/finalize - Finalize upload after presigned URL upload
 * Body: { objectName, originalName, mimeType, size }
 */
uploadRouter.post('/finalize', finalizeUpload);

export default uploadRouter;
