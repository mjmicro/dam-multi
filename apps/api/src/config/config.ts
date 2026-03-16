/**
 * Environment configuration
 * Centralized management of all environment variables
 * Defaults provided for development
 */

import { Config } from './types';
import {
  DEFAULT_API_PORT,
  DEFAULT_NODE_ENV,
  DEFAULT_MONGODB_URL,
  DEFAULT_MINIO_ENDPOINT,
  DEFAULT_MINIO_PORT,
  DEFAULT_MINIO_USE_SSL,
  DEFAULT_MINIO_ACCESS_KEY,
  DEFAULT_MINIO_SECRET_KEY,
  DEFAULT_MINIO_EXTERNAL_URL,
  DEFAULT_MINIO_BUCKET,
  DEFAULT_MINIO_REGION,
  DEFAULT_REDIS_URL,
  DEFAULT_QUEUE_NAME,
} from './constants';

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const env = process.env.NODE_ENV || DEFAULT_NODE_ENV;

  const config: Config = {
    app: {
      port: parseInt(process.env.API_PORT || String(DEFAULT_API_PORT), 10),
      env: env as 'development' | 'production' | 'test',
    },
    database: {
      mongoUrl: process.env.DATABASE_URL || process.env.MONGODB_URI || DEFAULT_MONGODB_URL,
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || DEFAULT_MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT || String(DEFAULT_MINIO_PORT), 10),
      useSSL: process.env.MINIO_USE_SSL === 'true' || DEFAULT_MINIO_USE_SSL,
      accessKey: process.env.MINIO_ACCESS_KEY || DEFAULT_MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY || DEFAULT_MINIO_SECRET_KEY,
      externalUrl: process.env.MINIO_ENDPOINT_EXTERNAL || DEFAULT_MINIO_EXTERNAL_URL,
      bucketName: process.env.MINIO_BUCKET || DEFAULT_MINIO_BUCKET,
      region: process.env.MINIO_REGION || DEFAULT_MINIO_REGION,
    },
    redis: {
      url: process.env.REDIS_URL || DEFAULT_REDIS_URL,
      retryPolicy: {
        maxRetriesPerRequest: null,
      },
    },
    queue: {
      name: process.env.QUEUE_NAME || DEFAULT_QUEUE_NAME,
    },
  };

  // Validate critical configuration
  if (!config.database.mongoUrl) {
    throw new Error('MONGODB_URI or DATABASE_URL environment variable is required');
  }

  if (!config.minio.accessKey || !config.minio.secretKey) {
    throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required');
  }

  return config;
}

/**
 * Get configuration instance (singleton pattern)
 */
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}
