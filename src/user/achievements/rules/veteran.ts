export const shouldUnlockVeteran = (
  createdAt: Date,
  now: Date = new Date(),
): boolean => {
  const unlockAt = new Date(createdAt);
  unlockAt.setFullYear(unlockAt.getFullYear() + 1);
  return now >= unlockAt;
};
