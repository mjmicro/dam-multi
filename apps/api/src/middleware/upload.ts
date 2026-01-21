import multer from 'multer';

/**
 * Configure multer for handling multipart/form-data uploads
 * Uses memory storage for direct upload to MinIO
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export const uploadMiddleware = upload.single('file');
