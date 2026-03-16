import { describe, it, expect } from 'vitest';
import { AssetStatus } from '@dam/database';

describe('AssetStatus', () => {
  it('has expected values', () => {
    expect(AssetStatus.PENDING).toBe('PENDING');
    expect(AssetStatus.PROCESSED).toBe('PROCESSED');
    expect(AssetStatus.FAILED).toBe('FAILED');
  });
});
