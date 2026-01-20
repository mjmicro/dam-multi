import { Request, Response } from 'express';
import { AssetService } from '../services/asset-service';
import {
    AssetStatus,
} from '@dam/database';

export const getAssets = async (req: Request, res: Response) => {
    const assetService: AssetService = req.app.locals.assetService;
    try {
        if (!assetService) {
            return res.status(503).json({ error: 'Service not initialized' });
        }

        const { status, mimeType } = req.query;
        const assets = await assetService.getAllAssets({
            status: status as AssetStatus | undefined,
            mimeType: mimeType as string | undefined,
        });

        res.json(assets);
    } catch (err: any) {
        res
            .status(500)
            .json({ error: 'Failed to fetch assets', details: err.message });
    }
}

/**
 * Get single asset by ID
 */
export const getAsset = async (req: Request, res: Response) => {

    const assetService: AssetService = req.app.locals.assetService;

    try {
        if (!assetService) {
            return res.status(503).json({ error: 'Service not initialized' });
        }

        const asset = await assetService.getAssetById(req.params.id);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json(asset);
    } catch (err: any) {
        res
            .status(500)
            .json({ error: 'Failed to fetch asset', details: err.message });
    }
}

/**
 * Delete single asset by ID
 */
export const deleteAsset = async (req: Request, res: Response) => {

    const assetService: AssetService = req.app.locals.assetService;

    try {
        if (!assetService) {
            return res.status(503).json({ error: 'Service not initialized' });
        }

        const asset = await assetService.getAssetById(req.params.id);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const success = await assetService.deleteAsset(req.params.id, asset.filename);

        if (success) {
            res.json({ message: 'Asset deleted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to delete asset' });
        }
    } catch (err: any) {
        res.status(500).json({ error: 'Delete failed', details: err.message });
    }
}


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
        const processed = await assetService.getAssetsByStatus(
            AssetStatus.PROCESSED
        );
        const failed = await assetService.getAssetsByStatus(AssetStatus.FAILED);

        res.json({
            total,
            pending: pending.length,
            processed: processed.length,
            failed: failed.length,
        });
    } catch (err: any) {
        res
            .status(500)
            .json({ error: 'Failed to fetch stats', details: err.message });
    }
}