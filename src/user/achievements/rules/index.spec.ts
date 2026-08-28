import { HOLIDAY_RULES } from './index';
import { valentineRule } from './valentine';
import { christmasSpiritRule } from './christmas-spirit';
import { halloweenRule } from './halloween';
import { ACHIEVEMENT_KEYS } from '../achievement-keys';

describe('holiday rules', () => {
  it('pins each holiday to the right calendar day', () => {
    expect(valentineRule).toEqual({ key: 'valentine', month: 2, day: 14 });
    expect(christmasSpiritRule).toEqual({
      key: 'christmas_spirit',
      month: 12,
      day: 25,
    });
    expect(halloweenRule).toEqual({ key: 'halloween', month: 10, day: 31 });
  });
});

describe('HOLIDAY_RULES', () => {
  it('registers every holiday rule', () => {
    expect(HOLIDAY_RULES).toHaveLength(3);
    expect(HOLIDAY_RULES.map((rule) => rule.key)).toEqual([
      'valentine',
      'christmas_spirit',
      'halloween',
    ]);
  });

  it('only uses keys the client knows about', () => {
    for (const rule of HOLIDAY_RULES) {
      expect(ACHIEVEMENT_KEYS).toContain(rule.key);
    }
  });

  it('has no two holidays on the same day', () => {
    const days = HOLIDAY_RULES.map((rule) => `${rule.month}-${rule.day}`);

    expect(new Set(days).size).toBe(days.length);
  });

  it('uses 1 based months and valid days', () => {
    for (const rule of HOLIDAY_RULES) {
      expect(rule.month).toBeGreaterThanOrEqual(1);
      expect(rule.month).toBeLessThanOrEqual(12);
      expect(rule.day).toBeGreaterThanOrEqual(1);
      expect(rule.day).toBeLessThanOrEqual(31);
    }
  });
});
