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

export const AUDIO_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_AUDIO_EXTENSIONS = [
  'webm',
  'ogg',
  'opus',
  'mp4',
  'm4a',
  'mp3',
  'wav',
];

/**
 * MediaRecorder wraps Opus in a WebM container, which file-type reports as
 * `video/webm` (Safari's `audio/mp4` is reported as `video/mp4`). Matching on
 * the detected extension keeps those recordings from being rejected.
 */
export const isAllowedAudioExtension = (ext?: string) =>
  !!ext && ALLOWED_AUDIO_EXTENSIONS.includes(ext.toLowerCase());

export const audioUploadOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: AUDIO_UPLOAD_LIMIT_BYTES,
  },
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const mimetype = file.mimetype?.split(';')[0];

    if (
      !mimetype?.startsWith('audio/') &&
      mimetype !== 'video/webm' &&
      mimetype !== 'video/mp4'
    ) {
      cb(new Error('Only audio files are allowed'), false);
      return;
    }

    cb(null, true);
  },
};

export const clampPagination = (page?: number, limit?: number) => {
  const safePage =
    Number.isFinite(page) && (page as number) > 0 ? Number(page) : 1;
  const safeLimit = Math.min(
    Math.max(
      Number.isFinite(limit) && (limit as number) > 0 ? Number(limit) : 10,
      1,
    ),
    50,
  );

  return {
    page: safePage,
    limit: safeLimit,
  };
};
