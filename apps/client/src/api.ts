import axios, { AxiosInstance } from 'axios';
import { DEFAULT_API_URL } from './config';

export interface Asset {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  providerPath: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'PROCESSED_NO_FILE';
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    format?: string;
    thumbnail?: string;
  };
  tags: string[];
  renditions?: VideoRendition[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoRendition {
  label: string;
  width: number;
  height: number;
  bitrate: number;
  format: string;
  isOriginal: boolean;
}

export interface UploadResponse {
  message: string;
  assetId: string;
  objectName: string;
  jobId: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(private apiUrl: string = DEFAULT_API_URL) {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Upload files using multipart/form-data
   */
  async uploadFiles(files: File[]): Promise<UploadResponse[]> {
    const results: UploadResponse[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await axios.post<any>('/api/upload/multipart', formData, {
          baseURL: this.apiUrl,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        results.push({
          message: response.data.message as string,
          assetId: response.data.data.assetId as string,
          objectName: response.data.data.objectName as string,
          jobId: response.data.data.jobId as string,
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Upload single file using multipart/form-data (alternative)
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await axios.post<any>('/api/upload/multipart', formData, {
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      message: response.data.message as string,
      assetId: response.data.data.assetId as string,
      objectName: response.data.data.objectName as string,
      jobId: response.data.data.jobId as string,
    };
  }

  /**
   * Legacy: Upload file using base64 (kept for backward compatibility)
   */
  async uploadFileBase64(file: File): Promise<UploadResponse> {
    const data = await this.fileToBase64(file);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.client.post<any>('/api/upload', {
      originalName: file.name,
      mimeType: file.type,
      data,
    });

    return {
      message: response.data.message as string,
      assetId: response.data.data.assetId as string,
      objectName: response.data.data.objectName as string,
      jobId: response.data.data.jobId as string,
    };
  }

  async getAssets(filters?: {
    status?: string;
    name?: string;
    tags?: string[];
    type?: 'image' | 'video' | 'audio';
  }): Promise<Asset[]> {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.name) params.name = filters.name;
    if (filters?.tags?.length) params.tags = filters.tags.join(',');
    if (filters?.type) params.type = filters.type;
    const response = await this.client.get<Asset[]>('/api/assets', { params });
    return response.data;
  }

  async addTags(assetId: string, tags: string[]): Promise<Asset> {
    const response = await this.client.post<Asset>(`/api/assets/${assetId}/tags`, { tags });
    return response.data;
  }

  async removeTags(assetId: string, tags: string[]): Promise<Asset> {
    const response = await this.client.delete<Asset>(`/api/assets/${assetId}/tags`, {
      data: { tags },
    });
    return response.data;
  }

  async getAsset(id: string): Promise<Asset> {
    const response = await this.client.get<Asset>(`/api/assets/${id}`);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/api/assets/${id}`);
  }

  async getPresignedUrl(
    assetId: string,
    purpose: 'preview' | 'download',
    expiryMinutes: number = 30,
    renditionLabel?: string,
  ): Promise<string> {
    const params: Record<string, string | number> = { purpose, expiryMinutes };
    if (renditionLabel) params.renditionLabel = renditionLabel;
    const response = await this.client.get<{ url: string }>(`/api/assets/${assetId}/presign`, {
      params,
    });
    return response.data.url;
  }

  async getThumbnailPresignedUrl(assetId: string, expiryMinutes: number = 30): Promise<string> {
    const response = await this.client.get<{ url: string }>(
      `/api/assets/${assetId}/thumbnail/presign`,
      { params: { expiryMinutes } },
    );
    return response.data.url;
  }

  async getStats(): Promise<{
    totalAssets: number;
    byStatus: Record<string, number>;
    totalSize: number;
  }> {
    const response = await this.client.get('/api/stats');
    return response.data;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const apiClient = new ApiClient(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env.VITE_API_URL as string,
);
