import * as Minio from 'minio';
import { Model } from 'mongoose';
import { IThumbnailDocument } from '@dam/database';
import { ValidationError } from '../../services/types.js';
import { DEFAULT_BUCKET_NAME } from '../../config/constants.js';
import { getConfig } from '../../config/config.js';

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
      ? this.createExternalSignerClient()
      : this.minioClient;

    const url = await signerClient.presignedGetObject(
      DEFAULT_BUCKET_NAME,
      thumbnail.providerPath,
      expirySeconds,
    );

    return { url };
  }

  private createExternalSignerClient(): Minio.Client {
    const config = getConfig();
    const externalUrl = new URL(this.minioExternalUrl);
    const host = externalUrl.hostname || 'localhost';
    const port = externalUrl.port
      ? Number(externalUrl.port)
      : externalUrl.protocol === 'https:'
        ? 443
        : 80;
    const useSSL = externalUrl.protocol === 'https:';

    return new Minio.Client({
      endPoint: host,
      port,
      useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
      region: config.minio.region,
    });
  }
}
