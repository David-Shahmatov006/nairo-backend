import { memoryStorage } from 'multer';

export const IMAGE_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;

export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: IMAGE_UPLOAD_LIMIT_BYTES,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!file.mimetype?.startsWith('image/')) {
      cb(new Error('Only image files are allowed'), false);
      return;
    }

    cb(null, true);
  },
};

export const clampPagination = (page?: number, limit?: number) => {
  const safePage = Number.isFinite(page) && (page as number) > 0 ? Number(page) : 1;
  const safeLimit = Math.min(
    Math.max(Number.isFinite(limit) && (limit as number) > 0 ? Number(limit) : 10, 1),
    50,
  );

  return {
    page: safePage,
    limit: safeLimit,
  };
};
