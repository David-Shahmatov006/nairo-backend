import { getZonedDateParts, isValidTimeZone } from './get-zoned-date-parts';

describe('isValidTimeZone', () => {
  it('accepts IANA zones', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Europe/Kyiv')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
  });

  it('rejects unknown or malformed zones', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('Europe//Kyiv')).toBe(false);
  });
});

describe('getZonedDateParts', () => {
  it('reads the parts in UTC', () => {
    const date = new Date('2024-03-05T01:30:00Z');

    expect(getZonedDateParts(date, 'UTC')).toEqual({
      year: 2024,
      month: 3,
      day: 5,
      hour: 1,
    });
  });

  it('shifts the hour into the requested zone', () => {
    // 01:30 UTC is 03:30 in Kyiv, which is inside the night owl window.
    const date = new Date('2024-03-05T01:30:00Z');

    expect(getZonedDateParts(date, 'Europe/Kyiv')).toEqual({
      year: 2024,
      month: 3,
      day: 5,
      hour: 3,
    });
  });

  it('rolls the date back when the zone is behind UTC', () => {
    const date = new Date('2024-03-05T01:30:00Z');

    expect(getZonedDateParts(date, 'America/New_York')).toEqual({
      year: 2024,
      month: 3,
      day: 4,
      hour: 20,
    });
  });

  it('uses a 0 to 23 hour cycle instead of 24 at midnight', () => {
    const date = new Date('2024-03-05T00:15:00Z');

    expect(getZonedDateParts(date, 'UTC').hour).toBe(0);
  });

  it('returns numbers, not zero padded strings', () => {
    const parts = getZonedDateParts(new Date('2024-01-02T03:00:00Z'), 'UTC');

    expect(parts).toEqual({ year: 2024, month: 1, day: 2, hour: 3 });
    expect(typeof parts.month).toBe('number');
  });

  it('resolves a holiday date correctly across zones', () => {
    // 23:30 UTC on Feb 13 is already Feb 14 in Kyiv.
    const date = new Date('2024-02-13T23:30:00Z');

    expect(getZonedDateParts(date, 'Europe/Kyiv')).toMatchObject({
      month: 2,
      day: 14,
    });
    expect(getZonedDateParts(date, 'UTC')).toMatchObject({
      month: 2,
      day: 13,
    });
  });
});
