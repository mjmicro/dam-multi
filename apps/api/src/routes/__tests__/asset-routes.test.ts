import { describe, it, expect } from 'vitest';
import assetRouter from '../asset-routes';
import express from 'express';

describe('assetRouter', () => {
  it('should mount routes', () => {
    const app = express();
    app.use('/api/assets', assetRouter);
    expect(app._router).toBeDefined();
  });
});
