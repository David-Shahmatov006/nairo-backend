import {
  audioUploadOptions,
  clampPagination,
  isAllowedAudioExtension,
} from './upload.utils';

describe('isAllowedAudioExtension', () => {
  it('accepts the containers MediaRecorder produces', () => {
    expect(isAllowedAudioExtension('webm')).toBe(true);
    expect(isAllowedAudioExtension('mp4')).toBe(true);
    expect(isAllowedAudioExtension('ogg')).toBe(true);
  });

  it('accepts the remaining audio containers', () => {
    expect(isAllowedAudioExtension('opus')).toBe(true);
    expect(isAllowedAudioExtension('m4a')).toBe(true);
    expect(isAllowedAudioExtension('mp3')).toBe(true);
    expect(isAllowedAudioExtension('wav')).toBe(true);
  });

  it('is case insensitive', () => {
    expect(isAllowedAudioExtension('WEBM')).toBe(true);
  });

  it('rejects other extensions', () => {
    expect(isAllowedAudioExtension('png')).toBe(false);
    expect(isAllowedAudioExtension('exe')).toBe(false);
    expect(isAllowedAudioExtension('avi')).toBe(false);
  });

  it('rejects a missing extension', () => {
    expect(isAllowedAudioExtension()).toBe(false);
    expect(isAllowedAudioExtension('')).toBe(false);
  });
});

describe('audioUploadOptions.fileFilter', () => {
  const filter = (mimetype: string) => {
    const cb = jest.fn();

    audioUploadOptions.fileFilter(
      {} as Express.Request,
      { mimetype } as Express.Multer.File,
      cb,
    );

    return cb;
  };

  it('accepts audio mime types with codec parameters', () => {
    expect(filter('audio/webm;codecs=opus')).toHaveBeenCalledWith(null, true);
    expect(filter('audio/mp4')).toHaveBeenCalledWith(null, true);
  });

  it('accepts the video containers browsers report for audio-only recordings', () => {
    expect(filter('video/webm')).toHaveBeenCalledWith(null, true);
    expect(filter('video/mp4')).toHaveBeenCalledWith(null, true);
  });

  it('rejects anything else', () => {
    const cb = filter('image/png');

    expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
  });
});

describe('clampPagination', () => {
  it('falls back to the first page with 10 items', () => {
    expect(clampPagination()).toEqual({ page: 1, limit: 10 });
  });

  it('keeps valid values', () => {
    expect(clampPagination(3, 25)).toEqual({ page: 3, limit: 25 });
  });

  it('clamps a non positive page to 1', () => {
    expect(clampPagination(0).page).toBe(1);
    expect(clampPagination(-5).page).toBe(1);
  });

  it('caps the limit at 50', () => {
    expect(clampPagination(1, 51).limit).toBe(50);
    expect(clampPagination(1, 10_000).limit).toBe(50);
  });

  it('allows the limit boundaries', () => {
    expect(clampPagination(1, 1).limit).toBe(1);
    expect(clampPagination(1, 50).limit).toBe(50);
  });

  it('falls back to 10 for a non positive limit', () => {
    expect(clampPagination(1, 0).limit).toBe(10);
    expect(clampPagination(1, -3).limit).toBe(10);
  });

  it('ignores values that are not finite numbers', () => {
    expect(clampPagination(NaN, NaN)).toEqual({ page: 1, limit: 10 });
    expect(clampPagination(Infinity, Infinity)).toEqual({ page: 1, limit: 10 });
  });

  it('passes fractional values through unchanged', () => {
    expect(clampPagination(2.5, 25.7)).toEqual({ page: 2.5, limit: 25.7 });
  });
});
