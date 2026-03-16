import { describe, it, expect } from 'vitest';
import uploadRouter from '../upload-routes';
import express from 'express';

describe('uploadRouter', () => {
  it('should mount routes', () => {
    const app = express();
    app.use('/api/upload', uploadRouter);
    expect(app._router).toBeDefined();
  });
});
