import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AchievementsService } from './achievements/achievements.service';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

type UserRow = {
  id: string;
  email: string;
  username: string;
  preferredLanguage: string;
  following?: UserRow[];
  followers?: UserRow[];
};

type FindOneArgs = {
  where?: { id?: string; email?: string; username?: string };
};

const userRow = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'first@example.com',
  username: 'first',
  preferredLanguage: 'en',
  following: [],
  followers: [],
  ...overrides,
});

const setup = async (rows: UserRow[] = [userRow()]) => {
  const repo = {
    findOne: jest.fn((args: FindOneArgs) => {
      const where = args.where ?? {};
      const match = rows.find(
        (row) =>
          (where.id !== undefined && row.id === where.id) ||
          (where.email !== undefined && row.email === where.email) ||
          (where.username !== undefined && row.username === where.username),
      );

      return Promise.resolve(match ?? null);
    }),
    save: jest.fn((row: UserRow) => Promise.resolve(row)),
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
  };

  const achievements = {
    evaluatePolyglot: jest.fn<Promise<boolean>, [string, string, string]>(),
  };
  achievements.evaluatePolyglot.mockResolvedValue(false);

  const moduleRef = await Test.createTestingModule({
    providers: [
      UserService,
      {
        provide: getRepositoryToken(User),
        useValue: repo as unknown as Repository<User>,
      },
      { provide: AchievementsService, useValue: achievements },
    ],
  }).compile();

  return {
    service: moduleRef.get(UserService),
    repo,
    achievements,
    rows,
  };
};

describe('UserService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('toggleFollow', () => {
    it('follows a user that is not followed yet', async () => {
      const current = userRow({
        id: 'a',
        email: 'a@example.com',
        username: 'a',
      });
      const target = userRow({
        id: 'b',
        email: 'b@example.com',
        username: 'b',
      });
      const { service, repo } = await setup([current, target]);

      await expect(service.toggleFollow('a', 'b')).resolves.toEqual({
        isFollowing: true,
      });

      expect(current.following?.map((user) => user.id)).toEqual(['b']);
      expect(target.followers?.map((user) => user.id)).toEqual(['a']);
      expect(repo.save).toHaveBeenCalledTimes(2);
    });

    it('unfollows on the second call', async () => {
      const current = userRow({
        id: 'a',
        email: 'a@example.com',
        username: 'a',
      });
      const target = userRow({
        id: 'b',
        email: 'b@example.com',
        username: 'b',
      });
      const { service } = await setup([current, target]);

      const first = await service.toggleFollow('a', 'b');
      const second = await service.toggleFollow('a', 'b');

      expect(first).toEqual({ isFollowing: true });
      expect(second).toEqual({ isFollowing: false });
      expect(current.following).toEqual([]);
      expect(target.followers).toEqual([]);
    });

    it('treats missing relation arrays as empty', async () => {
      const current = userRow({
        id: 'a',
        email: 'a@example.com',
        username: 'a',
        following: undefined,
      });
      const target = userRow({
        id: 'b',
        email: 'b@example.com',
        username: 'b',
        followers: undefined,
      });
      const { service } = await setup([current, target]);

      await expect(service.toggleFollow('a', 'b')).resolves.toEqual({
        isFollowing: true,
      });
      expect(current.following).toHaveLength(1);
      expect(target.followers).toHaveLength(1);
    });

    it('rejects an unknown target user', async () => {
      const { service, repo } = await setup([userRow({ id: 'a' })]);

      await expect(service.toggleFollow('a', 'ghost')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown current user', async () => {
      const { service, repo } = await setup([userRow({ id: 'b' })]);

      await expect(service.toggleFollow('ghost', 'b')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('changeLanguage', () => {
    it('persists the language and returns polyglot in newlyUnlocked', async () => {
      const row = userRow({ preferredLanguage: 'en' });
      const { service, achievements } = await setup([row]);
      achievements.evaluatePolyglot.mockResolvedValue(true);

      const result = await service.changeLanguage('user-1', 'uk');

      expect(result.preferredLanguage).toBe('uk');
      expect(result.newlyUnlocked).toEqual(['polyglot']);
      expect(achievements.evaluatePolyglot).toHaveBeenCalledWith(
        'user-1',
        'en',
        'uk',
      );
      expect(row.preferredLanguage).toBe('uk');
    });

    it('returns an empty newlyUnlocked list when nothing is granted', async () => {
      const { service, achievements, repo } = await setup();
      achievements.evaluatePolyglot.mockResolvedValue(false);

      const result = await service.changeLanguage('user-1', 'en');

      expect(result.newlyUnlocked).toEqual([]);
      // Characterization: the language is written before the achievement is
      // evaluated, so a no-op change still hits the database.
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown user', async () => {
      const { service, achievements } = await setup();

      await expect(service.changeLanguage('ghost', 'uk')).rejects.toThrow(
        NotFoundException,
      );
      expect(achievements.evaluatePolyglot).not.toHaveBeenCalled();
    });
  });

  describe('isEmailExists', () => {
    it('reports true for a known email', async () => {
      const { service } = await setup([
        userRow({ email: 'taken@example.com' }),
      ]);

      await expect(service.isEmailExists('taken@example.com')).resolves.toEqual(
        {
          exists: true,
        },
      );
    });

    it('reports false for an unknown email', async () => {
      const { service } = await setup([
        userRow({ email: 'taken@example.com' }),
      ]);

      await expect(service.isEmailExists('free@example.com')).resolves.toEqual({
        exists: false,
      });
    });
  });

  describe('checkUserFields', () => {
    it('reports each field independently', async () => {
      const { service } = await setup([
        userRow({ email: 'taken@example.com', username: 'taken' }),
      ]);

      await expect(
        service.checkUserFields({
          email: 'taken@example.com',
          username: 'free',
        }),
      ).resolves.toEqual({ emailExists: true, usernameExists: false });

      await expect(
        service.checkUserFields({
          email: 'free@example.com',
          username: 'taken',
        }),
      ).resolves.toEqual({ emailExists: false, usernameExists: true });
    });
  });

  describe('changeEmail', () => {
    it('rejects an email that belongs to somebody else', async () => {
      const { service, repo } = await setup([
        userRow({ id: 'user-1', email: 'mine@example.com', username: 'mine' }),
        userRow({
          id: 'user-2',
          email: 'theirs@example.com',
          username: 'theirs',
        }),
      ]);

      await expect(
        service.changeEmail('user-1', 'theirs@example.com'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('updates the email when it is free', async () => {
      const row = userRow({ email: 'mine@example.com' });
      const { service } = await setup([row]);

      const result = await service.changeEmail('user-1', 'new@example.com');

      expect(result.email).toBe('new@example.com');
    });
  });

  describe('updateProfile', () => {
    it('rejects a username that is already taken', async () => {
      const { service, repo } = await setup([
        userRow({ id: 'user-1', username: 'mine' }),
        userRow({ id: 'user-2', username: 'theirs', email: 'b@example.com' }),
      ]);

      await expect(
        service.updateProfile('user-1', { username: 'theirs' }),
      ).rejects.toThrow(ConflictException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('allows keeping the same username', async () => {
      const { service, repo } = await setup([
        userRow({ id: 'user-1', username: 'mine' }),
      ]);

      await service.updateProfile('user-1', { username: 'mine', bio: 'hello' });

      expect(repo.update).toHaveBeenCalledWith('user-1', {
        username: 'mine',
        bio: 'hello',
      });
    });
  });
});
