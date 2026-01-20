/**
 * Asset Routes - RESTful asset endpoints
 * Pattern: /api/assets
 */

import express from 'express';
import { deleteAsset, getAsset, getStats, getAssets } from '../controllers/asset-controller';

const assetRouter = express.Router();

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
assetRouter.get('/:id', getAsset);

/**
 * DELETE /api/assets/:id - Delete specific asset
 */
assetRouter.delete('/:id', deleteAsset);

export default assetRouter;
