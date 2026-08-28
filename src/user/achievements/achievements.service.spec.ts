import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ACHIEVEMENT_KEYS, AchievementKey } from './achievement-keys';
import {
  AchievementListItem,
  AchievementsService,
} from './achievements.service';

type StoredUser = {
  id: string;
  createdAt: Date;
  unlockedAchievements: string[] | null;
};

type FindOneArgs = { where?: { id?: string } };

const USER_ID = 'user-1';

// Veteran and the holiday rules are evaluated against `now`, so the whole suite
// runs on a frozen clock. The default is an ordinary, holiday free day.
const FROZEN_NOW = '2024-03-05T12:00:00Z';

const storedUser = (overrides: Partial<StoredUser> = {}): StoredUser => ({
  id: USER_ID,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  unlockedAchievements: [],
  ...overrides,
});

const veteranUser = (overrides: Partial<StoredUser> = {}): StoredUser =>
  storedUser({ createdAt: new Date('2020-06-01T00:00:00Z'), ...overrides });

const setup = async (
  options: { users?: StoredUser[]; userCount?: number } = {},
) => {
  const rows = options.users ?? [storedUser()];

  const repo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(rows.find((row) => row.id === args.where?.id) ?? null),
    ),
    save: jest.fn((row: StoredUser) => Promise.resolve(row)),
    count: jest.fn(() => Promise.resolve(options.userCount ?? rows.length)),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      AchievementsService,
      {
        provide: getRepositoryToken(User),
        useValue: repo as unknown as Repository<User>,
      },
    ],
  }).compile();

  return {
    service: moduleRef.get(AchievementsService),
    repo,
    rows,
    user: rows[0],
  };
};

const unlockedKeys = (list: AchievementListItem[]): AchievementKey[] =>
  list.filter((item) => item.unlocked).map((item) => item.key);

describe('AchievementsService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now: new Date(FROZEN_NOW) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('grant', () => {
    it('unlocks an achievement the user does not own yet', async () => {
      const { service, repo, user } = await setup();

      await expect(service.grant(USER_ID, 'night_owl')).resolves.toBe(true);

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(user.unlockedAchievements).toEqual(['night_owl']);
    });

    it('creates no new row and returns false for an achievement already owned', async () => {
      const { service, repo, user } = await setup({
        users: [storedUser({ unlockedAchievements: ['night_owl'] })],
      });

      await expect(service.grant(USER_ID, 'night_owl')).resolves.toBe(false);

      expect(repo.save).not.toHaveBeenCalled();
      expect(user.unlockedAchievements).toEqual(['night_owl']);
    });

    it('is idempotent across repeated calls', async () => {
      const { service, repo, user } = await setup();

      const results = [
        await service.grant(USER_ID, 'polyglot'),
        await service.grant(USER_ID, 'polyglot'),
        await service.grant(USER_ID, 'polyglot'),
      ];

      expect(results).toEqual([true, false, false]);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(user.unlockedAchievements).toEqual(['polyglot']);
    });

    it('keeps the achievements the user already had', async () => {
      const { service, user } = await setup({
        users: [storedUser({ unlockedAchievements: ['halloween'] })],
      });

      await service.grant(USER_ID, 'polyglot');

      expect(user.unlockedAchievements).toEqual(['halloween', 'polyglot']);
    });

    it('treats a missing achievement list as empty', async () => {
      const { service, user } = await setup({
        users: [storedUser({ unlockedAchievements: null })],
      });

      await expect(service.grant(USER_ID, 'early_bird')).resolves.toBe(true);

      expect(user.unlockedAchievements).toEqual(['early_bird']);
    });

    it('rejects an unknown user', async () => {
      const { service, repo } = await setup();

      await expect(service.grant('ghost', 'polyglot')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('reports every key the client knows about, locked by default', async () => {
      const { service } = await setup();

      const list = await service.list(USER_ID);

      expect(list.map((item) => item.key)).toEqual([...ACHIEVEMENT_KEYS]);
      expect(unlockedKeys(list)).toEqual([]);
    });

    it('reports veteran from createdAt even without a stored achievement row', async () => {
      const { service, repo, user } = await setup({
        users: [veteranUser({ unlockedAchievements: [] })],
      });

      const list = await service.list(USER_ID);

      expect(unlockedKeys(list)).toEqual(['veteran']);
      // Listing is read only: nothing is persisted for the derived veteran flag.
      expect(repo.save).not.toHaveBeenCalled();
      expect(user.unlockedAchievements).toEqual([]);
    });

    it('does not report veteran for an account younger than a year', async () => {
      const { service } = await setup({
        users: [storedUser({ createdAt: new Date('2024-01-01T00:00:00Z') })],
      });

      const list = await service.list(USER_ID);

      expect(unlockedKeys(list)).toEqual([]);
    });

    it('merges stored achievements with the derived veteran flag', async () => {
      const { service } = await setup({
        users: [veteranUser({ unlockedAchievements: ['halloween'] })],
      });

      const list = await service.list(USER_ID);

      expect(unlockedKeys(list).sort()).toEqual(['halloween', 'veteran']);
    });

    it('ignores stored keys that are not known achievements', async () => {
      const { service } = await setup({
        users: [storedUser({ unlockedAchievements: ['moon_landing'] })],
      });

      const list = await service.list(USER_ID);

      expect(list).toHaveLength(ACHIEVEMENT_KEYS.length);
      expect(unlockedKeys(list)).toEqual([]);
    });

    it('rejects an unknown user', async () => {
      const { service } = await setup();

      await expect(service.list('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateVisit', () => {
    it('grants the holiday of the calendar day in the user time zone', async () => {
      // 23:30 UTC on Feb 13 is already Feb 14 in Kyiv.
      jest.setSystemTime(new Date('2024-02-13T23:30:00Z'));
      const { service, user } = await setup();

      const result = await service.evaluateVisit(USER_ID, 'Europe/Kyiv');

      expect(result.newlyUnlocked).toEqual(['valentine']);
      expect(unlockedKeys(result.achievements)).toEqual(['valentine']);
      expect(user.unlockedAchievements).toEqual(['valentine']);
    });

    it('grants nothing for the same instant in a zone where the holiday has not started', async () => {
      jest.setSystemTime(new Date('2024-02-13T23:30:00Z'));
      const { service, repo } = await setup();

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual([]);
      expect(unlockedKeys(result.achievements)).toEqual([]);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('grants christmas_spirit on December 25', async () => {
      jest.setSystemTime(new Date('2024-12-25T08:00:00Z'));
      const { service } = await setup();

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual(['christmas_spirit']);
    });

    it('grants halloween on October 31', async () => {
      jest.setSystemTime(new Date('2024-10-31T08:00:00Z'));
      const { service } = await setup();

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual(['halloween']);
    });

    it('grants nothing on an ordinary day', async () => {
      const { service, repo } = await setup();

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual([]);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('includes veteran when the account is old enough, after the holidays', async () => {
      jest.setSystemTime(new Date('2024-02-14T08:00:00Z'));
      const { service, user } = await setup({ users: [veteranUser()] });

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual(['valentine', 'veteran']);
      expect(user.unlockedAchievements).toEqual(['valentine', 'veteran']);
    });

    it('reports only the achievements unlocked on this call', async () => {
      jest.setSystemTime(new Date('2024-02-14T08:00:00Z'));
      const { service } = await setup({
        users: [veteranUser({ unlockedAchievements: ['valentine'] })],
      });

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual(['veteran']);
      // The already owned achievement is still reported as unlocked in the list.
      expect(unlockedKeys(result.achievements).sort()).toEqual([
        'valentine',
        'veteran',
      ]);
    });

    it('reports nothing new on a second visit the same day', async () => {
      jest.setSystemTime(new Date('2024-02-14T08:00:00Z'));
      const { service } = await setup({ users: [veteranUser()] });

      const first = await service.evaluateVisit(USER_ID, 'UTC');
      const second = await service.evaluateVisit(USER_ID, 'UTC');

      expect(first.newlyUnlocked).toEqual(['valentine', 'veteran']);
      expect(second.newlyUnlocked).toEqual([]);
      expect(unlockedKeys(second.achievements)).toEqual(
        unlockedKeys(first.achievements),
      );
    });

    it('does not grant veteran when the account is too young', async () => {
      jest.setSystemTime(new Date('2024-02-14T08:00:00Z'));
      const { service } = await setup({
        users: [storedUser({ createdAt: new Date('2024-02-01T00:00:00Z') })],
      });

      const result = await service.evaluateVisit(USER_ID, 'UTC');

      expect(result.newlyUnlocked).toEqual(['valentine']);
    });

    it('turns an unknown time zone into a 400 instead of letting Intl blow up', async () => {
      const { service, repo } = await setup();

      for (const timeZone of ['', 'Not/AZone', 'Europe//Kyiv', 'moon/base']) {
        const failure = service.evaluateVisit(USER_ID, timeZone);

        await expect(failure).rejects.toThrow(BadRequestException);
        await expect(failure).rejects.toThrow('Invalid time zone');
      }

      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown user', async () => {
      const { service } = await setup();

      await expect(service.evaluateVisit('ghost', 'UTC')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('evaluateNightOwl', () => {
    // The service formats the given date through Intl with an explicit time
    // zone, so the input instants are written as absolute UTC timestamps.
    // Kyiv is UTC+2 in February.
    it('unlocks inside the 03:00 to 04:59 window of the user time zone', async () => {
      const { service, user } = await setup();

      await expect(
        service.evaluateNightOwl(
          USER_ID,
          new Date('2024-02-05T01:00:00Z'),
          'Europe/Kyiv',
        ),
      ).resolves.toBe(true);
      expect(user.unlockedAchievements).toEqual(['night_owl']);
    });

    it('unlocks at the last minute of the window', async () => {
      const { service } = await setup();

      await expect(
        service.evaluateNightOwl(
          USER_ID,
          new Date('2024-02-05T02:59:00Z'),
          'Europe/Kyiv',
        ),
      ).resolves.toBe(true);
    });

    it('does not unlock just before or just after the window', async () => {
      const { service, repo } = await setup();

      // 02:59 and 05:00 in Kyiv.
      await expect(
        service.evaluateNightOwl(
          USER_ID,
          new Date('2024-02-05T00:59:00Z'),
          'Europe/Kyiv',
        ),
      ).resolves.toBe(false);
      await expect(
        service.evaluateNightOwl(
          USER_ID,
          new Date('2024-02-05T03:00:00Z'),
          'Europe/Kyiv',
        ),
      ).resolves.toBe(false);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('judges the same instant differently per time zone', async () => {
      const { service } = await setup();
      const instant = new Date('2024-02-05T01:00:00Z');

      await expect(
        service.evaluateNightOwl(USER_ID, instant, 'UTC'),
      ).resolves.toBe(false);
      await expect(
        service.evaluateNightOwl(USER_ID, instant, 'Europe/Kyiv'),
      ).resolves.toBe(true);
    });

    it('returns false without touching the repository when no time zone is given', async () => {
      const { service, repo } = await setup();
      const insideWindow = new Date('2024-02-05T03:30:00Z');

      await expect(
        service.evaluateNightOwl(USER_ID, insideWindow),
      ).resolves.toBe(false);
      await expect(
        service.evaluateNightOwl(USER_ID, insideWindow, ''),
      ).resolves.toBe(false);

      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('returns false for an invalid time zone instead of throwing', async () => {
      const { service } = await setup();
      const insideWindow = new Date('2024-02-05T03:30:00Z');

      for (const timeZone of ['Not/AZone', 'Europe//Kyiv', 'moon/base']) {
        await expect(
          service.evaluateNightOwl(USER_ID, insideWindow, timeZone),
        ).resolves.toBe(false);
      }
    });

    it('returns false when the achievement is already owned', async () => {
      const { service, repo } = await setup({
        users: [storedUser({ unlockedAchievements: ['night_owl'] })],
      });

      await expect(
        service.evaluateNightOwl(
          USER_ID,
          new Date('2024-02-05T03:30:00Z'),
          'UTC',
        ),
      ).resolves.toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown user inside the window', async () => {
      const { service } = await setup();

      await expect(
        service.evaluateNightOwl(
          'ghost',
          new Date('2024-02-05T03:30:00Z'),
          'UTC',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateEarlyBird', () => {
    it('grants the achievement to the 100th user', async () => {
      const { service, user } = await setup({ userCount: 100 });

      await expect(service.evaluateEarlyBird(USER_ID)).resolves.toBe(true);
      expect(user.unlockedAchievements).toEqual(['early_bird']);
    });

    it('does not grant the achievement to the 101st user', async () => {
      const { service, repo } = await setup({ userCount: 101 });

      await expect(service.evaluateEarlyBird(USER_ID)).resolves.toBe(false);
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('grants the achievement well below the threshold', async () => {
      const { service } = await setup({ userCount: 1 });

      await expect(service.evaluateEarlyBird(USER_ID)).resolves.toBe(true);
    });

    it('never grants it again once owned', async () => {
      const { service, repo } = await setup({
        users: [storedUser({ unlockedAchievements: ['early_bird'] })],
        userCount: 50,
      });

      await expect(service.evaluateEarlyBird(USER_ID)).resolves.toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('evaluatePolyglot', () => {
    it('grants the achievement when the language actually changes', async () => {
      const { service, user } = await setup();

      await expect(service.evaluatePolyglot(USER_ID, 'en', 'uk')).resolves.toBe(
        true,
      );
      expect(user.unlockedAchievements).toEqual(['polyglot']);
    });

    it('does not touch the repository when the language is unchanged', async () => {
      const { service, repo } = await setup();

      await expect(service.evaluatePolyglot(USER_ID, 'en', 'en')).resolves.toBe(
        false,
      );
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('compares language codes case sensitively', async () => {
      // Characterization: 'en' -> 'EN' is treated as a real change, because the
      // comparison is a plain string inequality.
      const { service } = await setup();

      await expect(service.evaluatePolyglot(USER_ID, 'en', 'EN')).resolves.toBe(
        true,
      );
    });

    it('returns false when the achievement is already owned', async () => {
      const { service, repo } = await setup({
        users: [storedUser({ unlockedAchievements: ['polyglot'] })],
      });

      await expect(service.evaluatePolyglot(USER_ID, 'en', 'uk')).resolves.toBe(
        false,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
