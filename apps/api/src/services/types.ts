export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface UploadRequest {
  originalName: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface PresignedUrlResponse {
  url: string;
  objectName: string;
  expiresIn: number;
}

export interface UploadResponse {
  assetId: string;
  objectName: string;
  jobId: string;
  filename: string;
  size: number;
  status: string;
}
