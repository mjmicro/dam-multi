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

    // Validate basic HTTP input
    if (!originalName || !mimeType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: originalName, mimeType, data',
      });
    }

    // Delegate to service (which handles all validation and processing)
    const result = await uploadService.uploadFromBase64({
      originalName,
      mimeType,
      data,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded and processing started',
      data: result,
    });
  } catch (err: any) {
    console.error('Upload failed:', err.message);
    const statusCode = err.message.includes('not allowed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
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
      return res.status(400).json({
        success: false,
        error: 'No file provided in request',
      });
    }

    // Use multer's file properties
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
  } catch (err: any) {
    console.error('Multipart upload failed:', err.message);
    const statusCode = err.message.includes('not allowed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
};