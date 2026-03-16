import { Request, Response, NextFunction } from 'express';

/**
 * CORS middleware - Handle cross-origin requests
 */
export const corsMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};
