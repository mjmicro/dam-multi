/**
 * Upload Routes - File upload endpoints
 * Pattern: /api/upload*
 */

import express from 'express';
import { uploadFile } from '../controllers/upload-controller';

const uploadRouter = express.Router();

/**
 * POST /api/upload - Upload file with base64 data
 * Body: { originalName, mimeType, data: string (base64) }
 */
uploadRouter.post('/', uploadFile);

export default uploadRouter;
