/**
 * Upload Controller - Thin HTTP handler for file uploads
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
 * Get presigned upload URL from MinIO
 * GET /api/upload/url?fileName=document.pdf
 */
export const getUploadUrl = async (req: Request, res: Response) => {
  const uploadService: UploadService = req.app.locals.uploadService;

  try {
    if (!uploadService) {
      return res.status(503).json({ success: false, error: 'Upload service not initialized' });
    }

    const { fileName } = req.query;

    // Validate HTTP input
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'fileName query parameter is required',
      });
    }

    // Delegate to service
    const result = await uploadService.getPresignedUploadUrl(fileName);

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('Presigned URL generation failed:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * Finalize upload after presigned upload completion
 * POST /api/upload/finalize
 * Body: { objectName, originalName, mimeType, size }
 */
export const finalizeUpload = async (req: Request, res: Response) => {
  const uploadService: UploadService = req.app.locals.uploadService;

  try {
    if (!uploadService) {
      return res.status(503).json({ success: false, error: 'Upload service not initialized' });
    }

    const { objectName, originalName, mimeType, size } = req.body;

    // Validate HTTP input
    if (!objectName || !originalName || !mimeType || !size) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: objectName, originalName, mimeType, size',
      });
    }

    // Delegate to service
    const result = await uploadService.finalizePresignedUpload({
      objectName,
      originalName,
      mimeType,
      size,
    });

    res.status(202).json({
      success: true,
      message: 'Processing started',
      data: result,
    });
  } catch (err: any) {
    console.error('Finalize failed:', err.message);
    const statusCode = err.message.includes('not allowed') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message,
    });
  }
};
