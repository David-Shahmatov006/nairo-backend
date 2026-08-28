import { clampPagination } from './upload.utils';

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
