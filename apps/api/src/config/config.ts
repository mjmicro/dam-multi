/**
 * Environment configuration
 * Centralized management of all environment variables
 * Defaults provided for development
 */

export interface Config {
  app: {
    port: number;
    env: 'development' | 'production' | 'test';
  };
  database: {
    mongoUrl: string;
  };
  minio: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    externalUrl: string;
    bucketName: string;
    region: string;
  };
  redis: {
    url: string;
    retryPolicy: {
      maxRetriesPerRequest: number | null;
    };
  };
  queue: {
    name: string;
  };
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const env = process.env.NODE_ENV || 'development';

  const config: Config = {
    app: {
      port: parseInt(process.env.API_PORT || '4000', 10),
      env: env as 'development' | 'production' | 'test',
    },
    database: {
      mongoUrl:
        process.env.DATABASE_URL ||
        process.env.MONGO_URL ||
        'mongodb://mongo:27017/mediadb',
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      secretKey: process.env.MINIO_SECRET_KEY || 'password',
      externalUrl:
        process.env.MINIO_ENDPOINT_EXTERNAL || 'http://localhost:9000',
      bucketName: process.env.MINIO_BUCKET || 'assets',
      region: process.env.MINIO_REGION || 'us-east-1',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retryPolicy: {
        maxRetriesPerRequest: null,
      },
    },
    queue: {
      name: process.env.QUEUE_NAME || 'asset-tasks',
    },
  };

  // Validate critical configuration
  if (!config.database.mongoUrl) {
    throw new Error('MONGO_URL or DATABASE_URL environment variable is required');
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
