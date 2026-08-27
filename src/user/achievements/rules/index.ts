import { valentineRule } from './valentine';
import { christmasSpiritRule } from './christmas-spirit';
import { halloweenRule } from './halloween';
import type { HolidayRule } from './types';

export const HOLIDAY_RULES: HolidayRule[] = [
  valentineRule,
  christmasSpiritRule,
  halloweenRule,
];
