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
