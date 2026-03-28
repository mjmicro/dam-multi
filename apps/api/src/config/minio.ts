import * as Minio from 'minio';
import { getConfig } from './config.js';

/**
 * Creates a MinIO client bound to the external URL.
 * Presigned URLs must be signed with the host the browser will use,
 * which differs from the internal Docker host.
 */
export function createExternalSignerClient(externalUrl: string): Minio.Client {
  const config = getConfig();
  const parsed = new URL(externalUrl);
  const host = parsed.hostname || 'localhost';
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  const useSSL = parsed.protocol === 'https:';

  return new Minio.Client({
    endPoint: host,
    port,
    useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
    region: config.minio.region,
  });
}
