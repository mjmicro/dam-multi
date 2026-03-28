// MinIO connection defaults
export const DEFAULT_MINIO_ENDPOINT = 'minio';
export const DEFAULT_MINIO_PORT = 9000;
export const DEFAULT_MINIO_ACCESS_KEY = 'admin';
export const DEFAULT_MINIO_SECRET_KEY = 'password';
export const DEFAULT_MINIO_USE_SSL = false;
export const DEFAULT_MINIO_BUCKET = 'assets';

// Redis connection defaults
export const DEFAULT_REDIS_URL = 'redis://localhost:6379';

// Worker/queue
export const DEFAULT_QUEUE_NAME = 'asset-tasks';
export const DEFAULT_WORKER_CONCURRENCY = 3;

// Retry logic
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY_MS = 2000;

// Resolution metadata for video renditions
export const RESOLUTION_META: Record<string, { width: number; height: number; bitrate: number }> = {
  '1080p': { width: 1920, height: 1080, bitrate: 5000 },
  '720p': { width: 1280, height: 720, bitrate: 2500 },
  '480p': { width: 854, height: 480, bitrate: 1000 },
};
