export const ACHIEVEMENT_KEYS = [
  'night_owl',
  'early_bird',
  'polyglot',
  'valentine',
  'veteran',
  'christmas_spirit',
  'halloween',
] as const;

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number];
