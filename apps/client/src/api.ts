import axios, { AxiosInstance } from 'axios';

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
    transcoded?: Array<{ resolution: string; path: string }>;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  message: string;
  assetId: string;
  objectName: string;
  jobId: string;
}

export class ApiClient {
  private client: AxiosInstance;

  constructor(private apiUrl: string = 'http://localhost:4000') {
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

        const response = await axios.post<any>('/api/upload/multipart', formData, {
          baseURL: this.apiUrl,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        results.push({
          message: response.data.message,
          assetId: response.data.data.assetId,
          objectName: response.data.data.objectName,
          jobId: response.data.data.jobId,
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

    const response = await axios.post<any>('/api/upload/multipart', formData, {
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      message: response.data.message,
      assetId: response.data.data.assetId,
      objectName: response.data.data.objectName,
      jobId: response.data.data.jobId,
    };
  }

  /**
   * Legacy: Upload file using base64 (kept for backward compatibility)
   */
  async uploadFileBase64(file: File): Promise<UploadResponse> {
    const data = await this.fileToBase64(file);

    const response = await this.client.post<any>('/api/upload', {
      originalName: file.name,
      mimeType: file.type,
      data,
    });

    return {
      message: response.data.message,
      assetId: response.data.data.assetId,
      objectName: response.data.data.objectName,
      jobId: response.data.data.jobId,
    };
  }

  async getAssets(status?: string): Promise<Asset[]> {
    const params = status ? { status } : {};
    const response = await this.client.get<Asset[]>('/api/assets', { params });
    return response.data;
  }

  async getAsset(id: string): Promise<Asset> {
    const response = await this.client.get<Asset>(`/api/assets/${id}`);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.client.delete(`/api/assets/${id}`);
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
  (import.meta as any).env.VITE_API_URL
);
