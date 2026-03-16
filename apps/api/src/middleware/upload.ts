import multer from 'multer';
import type { RequestHandler } from 'express';
import { MAX_FILE_SIZE } from '../services/constants';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export const uploadMiddleware: RequestHandler = upload.single('file') as RequestHandler;
