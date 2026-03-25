import { Request, Response } from 'express';
import { AssetService } from '../services/asset-service.js';
import { AssetStatus } from '@dam/database';
import { TagService } from '../features/tags/tag-service.js';
import { TagsBodySchema } from '../features/tags/types.js';
import { ValidationError } from '../services/types.js';

export const getAssets = async (req: Request, res: Response) => {
  const assetService: AssetService = req.app.locals.assetService;
  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const { status, mimeType, name, tags, type } = req.query;
    const tagsArray = tags
      ? (tags as string)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
    const assets = await assetService.getAllAssets({
      status: (status as AssetStatus | undefined) ?? undefined,
      mimeType: (mimeType as string | undefined) ?? undefined,
      name: (name as string | undefined) ?? undefined,
      tags: tagsArray,
      type: (type as 'image' | 'video' | 'audio' | undefined) ?? undefined,
    });

    res.json(assets);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch assets', details: errMsg });
  }
};

/**
 * Get single asset by ID
 */
export const getAsset = async (req: Request, res: Response) => {
  const assetService: AssetService = req.app.locals.assetService;

  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const id = req.params.id || '';
    const asset = await assetService.getAssetById(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch asset', details: errMsg });
  }
};

/**
 * Get a short-lived MinIO presigned URL for preview/download.
 * Query params:
 * - purpose: `preview` | `download` (default: preview)
 * - expiryMinutes: number (clamped to 15–60, default: 30)
 */
export const getPresignedAssetUrl = async (req: Request, res: Response) => {
  const assetService: AssetService = req.app.locals.assetService;

  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const id = req.params.id || '';
    const purposeParam = (req.query.purpose as string | undefined) ?? 'preview';
    const purpose: 'preview' | 'download' = purposeParam === 'download' ? 'download' : 'preview';

    const expiryMinutesRaw = Number(req.query.expiryMinutes ?? 30);
    const expiryMinutes = Number.isFinite(expiryMinutesRaw) ? expiryMinutesRaw : 30;

    const { url } = await assetService.getPresignedAssetUrl(id, purpose, expiryMinutes);
    res.json({ url });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate presigned URL', details: errMsg });
  }
};

/**
 * Delete single asset by ID
 */
export const deleteAsset = async (req: Request, res: Response) => {
  const assetService: AssetService = req.app.locals.assetService;

  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const id = req.params.id || '';
    const asset = await assetService.getAssetById(id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const success = await assetService.deleteAsset(id, asset.filename);

    if (success) {
      res.json({ message: 'Asset deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete asset' });
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Delete failed', details: errMsg });
  }
};

export const addAssetTags = async (req: Request, res: Response) => {
  const tagService: TagService = req.app.locals.tagService;
  try {
    if (!tagService) return res.status(503).json({ error: 'Service not initialized' });
    const parsed = TagsBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const asset = await tagService.addTags(req.params.id, parsed.data.tags);
    res.json(asset);
  } catch (err: unknown) {
    const status = err instanceof ValidationError ? 404 : 500;
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(status).json({ error: errMsg });
  }
};

export const removeAssetTags = async (req: Request, res: Response) => {
  const tagService: TagService = req.app.locals.tagService;
  try {
    if (!tagService) return res.status(503).json({ error: 'Service not initialized' });
    const parsed = TagsBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const asset = await tagService.removeTags(req.params.id, parsed.data.tags);
    res.json(asset);
  } catch (err: unknown) {
    const status = err instanceof ValidationError ? 404 : 500;
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(status).json({ error: errMsg });
  }
};

/**
 * Get asset statistics
 */
export const getStats = async (req: Request, res: Response) => {
  const assetService: AssetService = req.app.locals.assetService;

  try {
    if (!assetService) {
      return res.status(503).json({ error: 'Service not initialized' });
    }

    const total = await assetService.countAssets();
    const pending = await assetService.getAssetsByStatus(AssetStatus.PENDING);
    const processed = await assetService.getAssetsByStatus(AssetStatus.PROCESSED);
    const failed = await assetService.getAssetsByStatus(AssetStatus.FAILED);

    res.json({
      total,
      pending: pending.length,
      processed: processed.length,
      failed: failed.length,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch stats', details: errMsg });
  }
};
