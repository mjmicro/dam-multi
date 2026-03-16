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

// Retry logic
export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY_MS = 2000;
