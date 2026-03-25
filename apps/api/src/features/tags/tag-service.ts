import { IAsset } from '@dam/database';
import { AssetRepository } from '../../repositories/asset-repository.js';
import { ValidationError } from '../../services/types.js';

export class TagService {
  constructor(private assetRepository: AssetRepository) {}

  async addTags(assetId: string, tags: string[]): Promise<IAsset> {
    const asset = await this.assetRepository.addTags(assetId, tags);
    if (!asset) throw new ValidationError(`Asset ${assetId} not found`);
    return asset;
  }

  async removeTags(assetId: string, tags: string[]): Promise<IAsset> {
    const asset = await this.assetRepository.removeTags(assetId, tags);
    if (!asset) throw new ValidationError(`Asset ${assetId} not found`);
    return asset;
  }
}
