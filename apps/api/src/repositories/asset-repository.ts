/**
 * Asset Repository - Data Access Layer
 */

import { Model } from 'mongoose';
import { IAsset, AssetStatus, AssetQueryFilters, IAssetDocument } from '@dam/database';

export class AssetRepository {
  constructor(private assetModel: Model<IAssetDocument>) {}

  /**
   * Create new asset record
   */
  async create(data: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    providerPath: string;
  }): Promise<IAsset> {
    const asset = await this.assetModel.create({
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      providerPath: data.providerPath,
      status: AssetStatus.PENDING,
      updatedAt: new Date(),
    });
    return asset.toObject();
  }

  /**
   * Get asset by ID
   */
  async findById(id: string): Promise<IAsset | null> {
    const asset = await this.assetModel.findById(id).lean();
    return asset as IAsset | null;
  }

  /**
   * Get all assets with filters
   */
  async findAll(filters?: AssetQueryFilters): Promise<IAsset[]> {
    const query: Record<string, unknown> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.mimeType) query.mimeType = filters.mimeType;
    return this.assetModel.find(query).lean();
  }

  /**
   * Delete asset
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.assetModel.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Count total assets
   */
  async count(): Promise<number> {
    return this.assetModel.countDocuments();
  }

  /**
   * Get assets by status
   */
  async findByStatus(status: AssetStatus): Promise<IAsset[]> {
    return this.assetModel.find({ status }).lean();
  }
}
