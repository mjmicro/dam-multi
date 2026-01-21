/**
 * Upload Routes - File upload endpoints
 * Pattern: /api/upload*
 */

import express from 'express';
import { uploadFile, uploadFileMultipart } from '../controllers/upload-controller';
import { uploadMiddleware } from '../middleware/upload';

const uploadRouter = express.Router();

/**
 * POST /api/upload - Upload file with base64 data (legacy)
 * Body: { originalName, mimeType, data: string (base64) }
 */
uploadRouter.post('/', uploadFile);

/**
 * POST /api/upload/multipart - Upload file with multipart/form-data
 * Form: file (binary)
 */
uploadRouter.post('/multipart', uploadMiddleware, uploadFileMultipart);

export default uploadRouter;

