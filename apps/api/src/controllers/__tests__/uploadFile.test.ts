import { describe, it, expect, vi } from 'vitest';
import { uploadFile } from '../upload-controller';

describe('uploadFile', () => {
  it('should upload file', async () => {
    const mockUploadService = { uploadFromBase64: vi.fn().mockResolvedValue({ url: 'file-url' }) };
    const req = {
      app: { locals: { uploadService: mockUploadService } },
      body: { originalName: 'test.txt', mimeType: 'text/plain', data: 'base64data' },
    } as any;
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalled();
  });

  it('should handle error on upload', async () => {
    const mockUploadService = { uploadFromBase64: vi.fn().mockRejectedValue(new Error('fail')) };
    const req = {
      app: { locals: { uploadService: mockUploadService } },
      body: { originalName: 'fail.txt', mimeType: 'text/plain', data: 'base64data' },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await uploadFile(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
  });
});
