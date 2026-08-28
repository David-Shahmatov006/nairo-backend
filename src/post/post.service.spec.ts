import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { R2Service } from 'src/r2.service';
import { AchievementsService } from 'src/user/achievements/achievements.service';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostService } from './post.service';

// The real R2Service pulls in `file-type`, which is ESM only and cannot be
// loaded by this CommonJS jest setup. Only the injection token is needed here.
jest.mock('src/r2.service', () => ({
  R2Service: class R2ServiceStub {},
}));

type UserRow = { id: string };

type PostRow = {
  id: string;
  title?: string;
  description?: string;
  image?: string;
  createdAt: Date;
  user?: UserRow;
};

type FindOneArgs = { where?: { id?: string } };

const USER_ID = 'user-1';
const POST_CREATED_AT = new Date('2024-02-05T01:30:00Z');

const postRow = (overrides: Partial<PostRow> = {}): PostRow => ({
  id: 'post-1',
  title: 'Old title',
  description: 'Old description',
  image: 'old-image.webp',
  createdAt: POST_CREATED_AT,
  user: { id: USER_ID },
  ...overrides,
});

const setup = async (
  options: { users?: UserRow[]; posts?: PostRow[] } = {},
) => {
  const users = options.users ?? [{ id: USER_ID }];
  const posts = options.posts ?? [];

  const postRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(posts.find((post) => post.id === args.where?.id) ?? null),
    ),
    create: jest.fn((data: Partial<PostRow>) => ({ ...data })),
    save: jest.fn((data: Partial<PostRow>) =>
      Promise.resolve({
        id: 'post-new',
        createdAt: POST_CREATED_AT,
        ...data,
      }),
    ),
    remove: jest.fn(() => Promise.resolve(undefined)),
  };

  const userRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(users.find((user) => user.id === args.where?.id) ?? null),
    ),
  };

  const r2 = {
    uploadFile: jest.fn<Promise<string>, [unknown, string]>(),
  };
  r2.uploadFile.mockResolvedValue('uploaded-image.webp');

  const achievements = {
    evaluateNightOwl: jest.fn<
      Promise<boolean>,
      [string, Date, string | undefined]
    >(),
  };
  achievements.evaluateNightOwl.mockResolvedValue(false);

  const moduleRef = await Test.createTestingModule({
    providers: [
      PostService,
      {
        provide: getRepositoryToken(Post),
        useValue: postRepo as unknown as Repository<Post>,
      },
      {
        provide: getRepositoryToken(User),
        useValue: userRepo as unknown as Repository<User>,
      },
      { provide: R2Service, useValue: r2 },
      { provide: AchievementsService, useValue: achievements },
    ],
  }).compile();

  return {
    service: moduleRef.get(PostService),
    postRepo,
    userRepo,
    r2,
    achievements,
    posts,
  };
};

describe('PostService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createPost', () => {
    it('rejects a title longer than 200 characters', async () => {
      const { service, postRepo } = await setup();

      await expect(
        service.createPost(USER_ID, 'x'.repeat(201), 'fine', 'image.webp'),
      ).rejects.toThrow(
        new BadRequestException('Max length of title is 200 symbols'),
      );
      expect(postRepo.save).not.toHaveBeenCalled();
    });

    it('accepts a title of exactly 200 characters', async () => {
      const { service, postRepo } = await setup();

      await service.createPost(USER_ID, 'x'.repeat(200), 'fine', 'image.webp');

      expect(postRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects a description longer than 1000 characters', async () => {
      const { service, postRepo } = await setup();

      // Characterization: the limit really is 1000, but the error message says
      // 200. Kept as is so the wording change stays a deliberate decision.
      await expect(
        service.createPost(USER_ID, 'fine', 'x'.repeat(1001), 'image.webp'),
      ).rejects.toThrow(
        new BadRequestException('Max length of description is 200 symbols'),
      );
      expect(postRepo.save).not.toHaveBeenCalled();
    });

    it('accepts a description of exactly 1000 characters', async () => {
      const { service, postRepo } = await setup();

      await service.createPost(USER_ID, 'fine', 'x'.repeat(1000), 'image.webp');

      expect(postRepo.save).toHaveBeenCalledTimes(1);
    });

    it('checks the author before the length limits', async () => {
      const { service } = await setup({ users: [] });

      // Characterization: an unknown author wins over an invalid title, so this
      // is a 404 rather than a 400.
      await expect(
        service.createPost('ghost', 'x'.repeat(201), 'fine', 'image.webp'),
      ).rejects.toThrow(NotFoundException);
    });

    it('passes the caller time zone and the stored createdAt to the night owl rule', async () => {
      const { service, achievements } = await setup();

      await service.createPost(
        USER_ID,
        'Title',
        'Description',
        'image.webp',
        'Europe/Kyiv',
      );

      expect(achievements.evaluateNightOwl).toHaveBeenCalledTimes(1);
      expect(achievements.evaluateNightOwl).toHaveBeenCalledWith(
        USER_ID,
        POST_CREATED_AT,
        'Europe/Kyiv',
      );
    });

    it('passes an undefined time zone through untouched', async () => {
      const { service, achievements } = await setup();

      await service.createPost(USER_ID, 'Title', 'Description', 'image.webp');

      expect(achievements.evaluateNightOwl).toHaveBeenCalledWith(
        USER_ID,
        POST_CREATED_AT,
        undefined,
      );
    });

    it('returns night_owl in newlyUnlocked when the rule granted it', async () => {
      const { service, achievements } = await setup();
      achievements.evaluateNightOwl.mockResolvedValue(true);

      const result = await service.createPost(
        USER_ID,
        'Title',
        'Description',
        'image.webp',
        'Europe/Kyiv',
      );

      expect(result.newlyUnlocked).toEqual(['night_owl']);
    });

    it('returns an empty newlyUnlocked list when nothing was granted', async () => {
      const { service, achievements } = await setup();
      achievements.evaluateNightOwl.mockResolvedValue(false);

      const result = await service.createPost(
        USER_ID,
        'Title',
        'Description',
        'image.webp',
        'Europe/Kyiv',
      );

      expect(result.newlyUnlocked).toEqual([]);
    });
  });

  describe('updatePost', () => {
    it('rejects a title longer than 200 characters', async () => {
      const { service, postRepo } = await setup({ posts: [postRow()] });

      await expect(
        service.updatePost('post-1', { title: 'x'.repeat(201) }),
      ).rejects.toThrow(
        new BadRequestException('Max length of title is 200 symbols'),
      );
      expect(postRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a description longer than 1000 characters', async () => {
      const { service } = await setup({ posts: [postRow()] });

      await expect(
        service.updatePost('post-1', { description: 'x'.repeat(1001) }),
      ).rejects.toThrow(
        new BadRequestException('Max length of description is 200 symbols'),
      );
    });

    it('rejects an unknown post', async () => {
      const { service } = await setup({ posts: [] });

      await expect(
        service.updatePost('ghost', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('writes the new title and description', async () => {
      const post = postRow();
      const { service } = await setup({ posts: [post] });

      await service.updatePost('post-1', {
        title: 'New title',
        description: 'New description',
      });

      expect(post.title).toBe('New title');
      expect(post.description).toBe('New description');
    });

    it('clears fields the caller left out of the dto', async () => {
      const post = postRow();
      const { service } = await setup({ posts: [post] });

      await service.updatePost('post-1', { description: 'Only this' });

      // Characterization of a real defect: updatePost assigns both fields
      // unconditionally, so a partial update wipes the omitted one.
      expect(post.title).toBeUndefined();
      expect(post.description).toBe('Only this');
    });

    it('uploads a replacement image when a file is given', async () => {
      const post = postRow();
      const { service, r2 } = await setup({ posts: [post] });
      const file = { originalname: 'new.webp' };

      await service.updatePost(
        'post-1',
        { title: 'New title', description: 'New description' },
        file as Express.Multer.File,
      );

      expect(r2.uploadFile).toHaveBeenCalledWith(file, 'posts');
      expect(post.image).toBe('uploaded-image.webp');
    });

    it('keeps the old image when no file is given', async () => {
      const post = postRow();
      const { service, r2 } = await setup({ posts: [post] });

      await service.updatePost('post-1', {
        title: 'New title',
        description: 'New description',
      });

      expect(r2.uploadFile).not.toHaveBeenCalled();
      expect(post.image).toBe('old-image.webp');
    });
  });

  describe('deletePost', () => {
    it('refuses to delete a post owned by somebody else', async () => {
      const { service, postRepo } = await setup({ posts: [postRow()] });

      await expect(
        service.deletePost('post-1', 'someone-else'),
      ).rejects.toThrow(ForbiddenException);
      expect(postRepo.remove).not.toHaveBeenCalled();
    });

    it('returns the removed image so the caller can clean up storage', async () => {
      const { service, postRepo } = await setup({ posts: [postRow()] });

      await expect(service.deletePost('post-1', USER_ID)).resolves.toEqual({
        success: true,
        image: 'old-image.webp',
      });
      expect(postRepo.remove).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown post', async () => {
      const { service } = await setup({ posts: [] });

      await expect(service.deletePost('ghost', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
