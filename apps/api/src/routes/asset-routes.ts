/**
 * Asset Routes - RESTful asset endpoints
 * Pattern: /api/assets
 */
import { Router } from 'express';

import {
  deleteAsset,
  getAsset,
  getPresignedAssetUrl,
  getStats,
  getAssets,
  addAssetTags,
  removeAssetTags,
} from '../controllers/asset-controller.js';

export const assetRouter: Router = Router();

/**
 * GET /api/assets/stats - Get asset statistics
 */
assetRouter.get('/stats', getStats);

/**
 * GET /api/assets - List all assets (with optional filters and pagination)
 * Query params: status, mimeType
 */
assetRouter.get('/', getAssets);

/**
 * GET /api/assets/:id - Get specific asset by ID
 */
/**
 * GET /api/assets/:id/presign - short-lived presigned URL for preview/download
 */
assetRouter.get('/:id/presign', getPresignedAssetUrl);

assetRouter.get('/:id', getAsset);

/**
 * POST   /api/assets/:id/tags - Add tags to asset
 * DELETE /api/assets/:id/tags - Remove tags from asset
 */
assetRouter.post('/:id/tags', addAssetTags);
assetRouter.delete('/:id/tags', removeAssetTags);

/**
 * DELETE /api/assets/:id - Delete specific asset
 */
assetRouter.delete('/:id', deleteAsset);

export default assetRouter;
