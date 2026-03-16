import { describe, it, expect, vi } from 'vitest';
import { getAssets } from '../asset-controller';

describe('getAssets', () => {
  it('should return assets', async () => {
    const mockAssetService = {
      getAllAssets: vi.fn().mockResolvedValue([{ id: '1', name: 'test' }]),
    };
    const req = { app: { locals: { assetService: mockAssetService } }, query: {} } as any;
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
    await getAssets(req, res);
    expect(res.json).toHaveBeenCalledWith([{ id: '1', name: 'test' }]);
  });

  it('should handle error', async () => {
    const mockAssetService = { getAllAssets: vi.fn().mockRejectedValue(new Error('fail')) };
    const req = { app: { locals: { assetService: mockAssetService } }, query: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    await getAssets(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
  });
});
