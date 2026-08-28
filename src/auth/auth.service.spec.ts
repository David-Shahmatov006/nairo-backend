import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AchievementsService } from 'src/user/achievements/achievements.service';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type BcryptMock = {
  hash: jest.Mock<Promise<string>, [string, number]>;
  compare: jest.Mock<Promise<boolean>, [string, string]>;
};

const bcryptMock = bcrypt as unknown as BcryptMock;

type UserRow = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  preferredLanguage: string;
};

const userRow = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'taken@example.com',
  username: 'taken',
  firstName: 'Ada',
  lastName: 'Lovelace',
  password: 'stored-hash',
  preferredLanguage: 'en',
  ...overrides,
});

const registerDto = (overrides: Partial<RegisterDto> = {}): RegisterDto => ({
  email: 'new@example.com',
  password: 'plain-password',
  username: 'newcomer',
  firstName: 'Grace',
  lastName: 'Hopper',
  language: 'uk',
  ...overrides,
});

const setup = () => {
  const queryBuilder = {
    addSelect: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn<Promise<UserRow | null>, []>(),
  };
  queryBuilder.addSelect.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);
  queryBuilder.getOne.mockResolvedValue(null);

  const repo = {
    findOneBy: jest.fn<Promise<UserRow | null>, [unknown]>(),
    findOne: jest.fn<Promise<UserRow | null>, [unknown]>(),
    create: jest.fn((data: Partial<UserRow>) => ({ ...data })),
    save: jest.fn((data: Partial<UserRow>) => ({ id: 'user-new', ...data })),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  repo.findOneBy.mockResolvedValue(null);
  repo.findOne.mockResolvedValue(null);

  const jwt = {
    sign: jest.fn(() => 'signed-token'),
    verify: jest.fn(() => ({ id: 'user-1' })),
  };

  const achievements = {
    evaluateEarlyBird: jest.fn<Promise<boolean>, [string]>(),
  };
  achievements.evaluateEarlyBird.mockResolvedValue(false);

  return { queryBuilder, repo, jwt, achievements };
};

const build = async (mocks: ReturnType<typeof setup>) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      {
        provide: getRepositoryToken(User),
        useValue: mocks.repo as unknown as Repository<User>,
      },
      { provide: JwtService, useValue: mocks.jwt },
      { provide: AchievementsService, useValue: mocks.achievements },
    ],
  }).compile();

  return moduleRef.get(AuthService);
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_ACCESS_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  describe('register', () => {
    it('rejects an email that is already registered', async () => {
      const mocks = setup();
      mocks.repo.findOneBy.mockResolvedValue(
        userRow({ email: 'new@example.com' }),
      );
      const service = await build(mocks);

      await expect(service.register(registerDto())).rejects.toThrow(
        new BadRequestException('Email already registered'),
      );

      // The username lookup and the hashing never run once the email clashes.
      expect(mocks.repo.findOne).not.toHaveBeenCalled();
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(mocks.repo.save).not.toHaveBeenCalled();
    });

    it('rejects a username that is already taken', async () => {
      const mocks = setup();
      mocks.repo.findOne.mockResolvedValue(userRow({ username: 'newcomer' }));
      const service = await build(mocks);

      await expect(service.register(registerDto())).rejects.toThrow(
        new BadRequestException(
          'Username is already taken. Try something else.',
        ),
      );

      expect(mocks.repo.save).not.toHaveBeenCalled();
    });

    it('stores a hashed password and never the plain one', async () => {
      const mocks = setup();
      bcryptMock.hash.mockResolvedValue('hashed-password');
      const service = await build(mocks);

      const result = await service.register(registerDto());

      expect(bcryptMock.hash).toHaveBeenCalledWith('plain-password', 10);
      expect(mocks.repo.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'hashed-password',
        username: 'newcomer',
        firstName: 'Grace',
        lastName: 'Hopper',
        preferredLanguage: 'uk',
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it('returns early_bird in newlyUnlocked when the user is eligible', async () => {
      const mocks = setup();
      mocks.achievements.evaluateEarlyBird.mockResolvedValue(true);
      const service = await build(mocks);

      const result = await service.register(registerDto());

      expect(result.newlyUnlocked).toEqual(['early_bird']);
      // Evaluated for the persisted user, so the row already exists.
      expect(mocks.achievements.evaluateEarlyBird).toHaveBeenCalledWith(
        'user-new',
      );
    });

    it('returns an empty newlyUnlocked list when the user is not eligible', async () => {
      const mocks = setup();
      mocks.achievements.evaluateEarlyBird.mockResolvedValue(false);
      const service = await build(mocks);

      const result = await service.register(registerDto());

      expect(result.newlyUnlocked).toEqual([]);
    });

    it('signs an access and a refresh token', async () => {
      const mocks = setup();
      mocks.jwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      const service = await build(mocks);

      const result = await service.register(registerDto());

      expect(result).toMatchObject({
        message: 'User successfully created',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mocks.jwt.sign).toHaveBeenNthCalledWith(
        1,
        { id: 'user-new', email: 'new@example.com' },
        { secret: 'access-secret', expiresIn: '1d' },
      );
      expect(mocks.jwt.sign).toHaveBeenNthCalledWith(
        2,
        { id: 'user-new' },
        { secret: 'refresh-secret', expiresIn: '7d' },
      );
    });
  });

  describe('login', () => {
    it('rejects an unknown email with a generic message', async () => {
      const mocks = setup();
      mocks.queryBuilder.getOne.mockResolvedValue(null);
      const service = await build(mocks);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toThrow(new BadRequestException('Invalid email or password'));

      expect(bcryptMock.compare).not.toHaveBeenCalled();
    });

    it('rejects a wrong password with the same generic message', async () => {
      const mocks = setup();
      mocks.queryBuilder.getOne.mockResolvedValue(userRow());
      bcryptMock.compare.mockResolvedValue(false);
      const service = await build(mocks);

      await expect(
        service.login({ email: 'taken@example.com', password: 'wrong' }),
      ).rejects.toThrow(new BadRequestException('Invalid email or password'));

      expect(bcryptMock.compare).toHaveBeenCalledWith('wrong', 'stored-hash');
      expect(mocks.jwt.sign).not.toHaveBeenCalled();
    });

    it('returns tokens and a password free user on success', async () => {
      const mocks = setup();
      mocks.queryBuilder.getOne.mockResolvedValue(userRow());
      bcryptMock.compare.mockResolvedValue(true);
      mocks.jwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      const service = await build(mocks);

      const result = await service.login({
        email: 'taken@example.com',
        password: 'correct',
      });

      expect(result).toMatchObject({
        message: 'Login successful',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(result.user).not.toHaveProperty('password');
      expect(result.user.email).toBe('taken@example.com');
    });

    it('asks for the normally hidden password column explicitly', async () => {
      const mocks = setup();
      mocks.queryBuilder.getOne.mockResolvedValue(userRow());
      bcryptMock.compare.mockResolvedValue(true);
      const service = await build(mocks);

      await service.login({ email: 'taken@example.com', password: 'correct' });

      expect(mocks.queryBuilder.addSelect).toHaveBeenCalledWith(
        'user.password',
      );
      expect(mocks.queryBuilder.where).toHaveBeenCalledWith(
        'user.email = :email',
        { email: 'taken@example.com' },
      );
    });
  });

  describe('refresh', () => {
    it('issues a new token pair for a valid refresh token', async () => {
      const mocks = setup();
      mocks.jwt.verify.mockReturnValue({ id: 'user-1' });
      mocks.repo.findOne.mockResolvedValue(userRow());
      mocks.jwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      const service = await build(mocks);

      await expect(service.refresh('valid-token')).resolves.toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(mocks.jwt.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'refresh-secret',
      });
    });

    it('rejects a token that does not verify', async () => {
      const mocks = setup();
      mocks.jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });
      const service = await build(mocks);

      await expect(service.refresh('garbage')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token whose user no longer exists', async () => {
      const mocks = setup();
      mocks.jwt.verify.mockReturnValue({ id: 'deleted-user' });
      mocks.repo.findOne.mockResolvedValue(null);
      const service = await build(mocks);

      await expect(service.refresh('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
