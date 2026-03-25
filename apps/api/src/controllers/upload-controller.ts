/**
 * Upload Controller - for file uploads
 * Responsibilities:
 * - Extract HTTP request data
 * - Validate request format
 * - Delegate to UploadService
 * - Format and return responses
 * - Handle HTTP errors
 */

import { Request, Response } from 'express';
import { UploadService } from '../services/upload-service';
import { ValidationError, StorageError } from '../services/types';

const toHttpError = (err: unknown): { status: number; message: string } => ({
  status: err instanceof ValidationError ? 400 : err instanceof StorageError ? 503 : 500,
  message: err instanceof Error ? err.message : 'Unknown error',
});

/**
 * Upload file with base64 data
 * POST /api/upload
 * Body: { originalName, mimeType, data (base64) }
 */
export const uploadFile = async (req: Request, res: Response) => {
  const uploadService: UploadService = req.app.locals.uploadService;

  try {
    if (!uploadService) {
      return res.status(503).json({ success: false, error: 'Upload service not initialized' });
    }

    const { originalName, mimeType, data } = req.body;

    if (!originalName || !mimeType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: originalName, mimeType, data',
      });
    }

    const result = await uploadService.uploadFromBase64({ originalName, mimeType, data });

    res.status(201).json({
      success: true,
      message: 'File uploaded and processing started',
      data: result,
    });
  } catch (err: unknown) {
    const { status, message } = toHttpError(err);
    console.error('Upload failed:', message);
    res.status(status).json({ success: false, error: message });
  }
};

/**
 * Upload file with multipart/form-data
 * POST /api/upload/multipart
 * Form: file (binary)
 */
export const uploadFileMultipart = async (req: Request, res: Response) => {
  const uploadService: UploadService = req.app.locals.uploadService;

  try {
    if (!uploadService) {
      return res.status(503).json({ success: false, error: 'Upload service not initialized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided in request' });
    }

    const result = await uploadService.uploadFromMultipart({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded and processing started',
      data: result,
    });
  } catch (err: unknown) {
    const { status, message } = toHttpError(err);
    console.error('Multipart upload failed:', message);
    res.status(status).json({ success: false, error: message });
  }
};
