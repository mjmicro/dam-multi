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

export interface FinalizeRequest {
  objectName: string;
  originalName: string;
  mimeType: string;
  size: number;
}
