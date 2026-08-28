import { shouldUnlockVeteran } from './veteran';

// Dates are built from local components on purpose: setFullYear inside the rule
// works in local time, so this keeps the assertions timezone independent.
describe('shouldUnlockVeteran', () => {
  it('unlocks exactly one year after registration', () => {
    const createdAt = new Date(2023, 0, 15, 12, 0, 0);
    const now = new Date(2024, 0, 15, 12, 0, 0);

    expect(shouldUnlockVeteran(createdAt, now)).toBe(true);
  });

  it('stays locked one day before the anniversary', () => {
    const createdAt = new Date(2023, 0, 15, 12, 0, 0);
    const now = new Date(2024, 0, 14, 12, 0, 0);

    expect(shouldUnlockVeteran(createdAt, now)).toBe(false);
  });

  it('stays locked one second before the anniversary', () => {
    const createdAt = new Date(2023, 0, 15, 12, 0, 0);
    const now = new Date(2024, 0, 15, 11, 59, 59);

    expect(shouldUnlockVeteran(createdAt, now)).toBe(false);
  });

  it('unlocks long after the anniversary', () => {
    const createdAt = new Date(2019, 5, 1);
    const now = new Date(2024, 5, 1);

    expect(shouldUnlockVeteran(createdAt, now)).toBe(true);
  });

  it('rolls a Feb 29 registration over to Mar 1 in a non leap year', () => {
    const createdAt = new Date(2024, 1, 29, 10, 0, 0);

    expect(
      shouldUnlockVeteran(createdAt, new Date(2025, 1, 28, 10, 0, 0)),
    ).toBe(false);
    expect(shouldUnlockVeteran(createdAt, new Date(2025, 2, 1, 10, 0, 0))).toBe(
      true,
    );
  });

  it('does not mutate the createdAt it is given', () => {
    const createdAt = new Date(2023, 0, 15, 12, 0, 0);
    const snapshot = createdAt.getTime();

    shouldUnlockVeteran(createdAt, new Date(2024, 0, 15));

    expect(createdAt.getTime()).toBe(snapshot);
  });

  it('defaults now to the current time', () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    expect(shouldUnlockVeteran(tenYearsAgo)).toBe(true);
    expect(shouldUnlockVeteran(new Date())).toBe(false);
  });
});
