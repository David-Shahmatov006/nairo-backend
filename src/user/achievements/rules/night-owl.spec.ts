import { isNightOwlHour } from './night-owl';

describe('isNightOwlHour', () => {
  it('unlocks between 03:00 and 04:59', () => {
    expect(isNightOwlHour(3)).toBe(true);
    expect(isNightOwlHour(4)).toBe(true);
  });

  it('does not unlock at the lower boundary minus one', () => {
    expect(isNightOwlHour(2)).toBe(false);
  });

  it('does not unlock at the upper boundary', () => {
    expect(isNightOwlHour(5)).toBe(false);
  });

  it('does not unlock for any other hour of the day', () => {
    const otherHours = [0, 1, 2, 5, 6, 12, 18, 22, 23];

    for (const hour of otherHours) {
      expect(isNightOwlHour(hour)).toBe(false);
    }
  });
});
