import { Request, Response } from 'express';

export const getHealth = async (_req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'dam-api',
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Health check failed', details: errMsg });
  }
};
