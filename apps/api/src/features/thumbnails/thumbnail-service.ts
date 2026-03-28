import * as Minio from 'minio';
import { Model } from 'mongoose';
import { IThumbnailDocument } from '@dam/database';
import { ValidationError } from '../../services/types.js';
import { DEFAULT_BUCKET_NAME } from '../../config/constants.js';
import { createExternalSignerClient } from '../../config/minio.js';

export class ThumbnailService {
  constructor(
    private thumbnailModel: Model<IThumbnailDocument>,
    private minioClient: Minio.Client,
    private minioExternalUrl: string,
  ) {}

  async getThumbnailPresignedUrl(
    assetId: string,
    expiryMinutes: number = 30,
  ): Promise<{ url: string }> {
    const thumbnail = await this.thumbnailModel.findOne({ assetId }).lean();
    if (!thumbnail) throw new ValidationError(`No thumbnail found for asset ${assetId}`);

    const clampedMinutes = Math.max(15, Math.min(60, Math.floor(expiryMinutes)));
    const expirySeconds = clampedMinutes * 60;

    const signerClient = this.minioExternalUrl?.trim()
      ? createExternalSignerClient(this.minioExternalUrl)
      : this.minioClient;

    const url = await signerClient.presignedGetObject(
      DEFAULT_BUCKET_NAME,
      thumbnail.providerPath,
      expirySeconds,
    );

    return { url };
  }
}
