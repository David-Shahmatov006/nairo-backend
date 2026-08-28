import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Post } from 'src/post/entities/post.entity';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CommentService } from './comment.service';
import { Comment } from './entities/comment.entity';

type CommentRow = { id: string; text: string; user: { id: string } };

type FindOneArgs = { where?: { id?: string } };

const AUTHOR_ID = 'user-1';
const POST_ID = 'post-1';

const commentRow = (overrides: Partial<CommentRow> = {}): CommentRow => ({
  id: 'comment-1',
  text: 'Original text',
  user: { id: AUTHOR_ID },
  ...overrides,
});

const setup = async (
  options: {
    comments?: CommentRow[];
    postIds?: string[];
    userIds?: string[];
  } = {},
) => {
  const comments = options.comments ?? [];
  const postIds = options.postIds ?? [POST_ID];
  const userIds = options.userIds ?? [AUTHOR_ID];

  const commentRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(
        comments.find((comment) => comment.id === args.where?.id) ?? null,
      ),
    ),
    create: jest.fn((data: Partial<CommentRow>) => ({ ...data })),
    save: jest.fn((data: Partial<CommentRow>) =>
      Promise.resolve({ id: 'comment-new', ...data }),
    ),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
    find: jest.fn(() => Promise.resolve(comments)),
  };

  const postRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(
        postIds.includes(args.where?.id ?? '') ? { id: args.where?.id } : null,
      ),
    ),
  };

  const userRepo = {
    findOne: jest.fn((args: FindOneArgs) =>
      Promise.resolve(
        userIds.includes(args.where?.id ?? '') ? { id: args.where?.id } : null,
      ),
    ),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      CommentService,
      {
        provide: getRepositoryToken(Comment),
        useValue: commentRepo as unknown as Repository<Comment>,
      },
      {
        provide: getRepositoryToken(Post),
        useValue: postRepo as unknown as Repository<Post>,
      },
      {
        provide: getRepositoryToken(User),
        useValue: userRepo as unknown as Repository<User>,
      },
    ],
  }).compile();

  return {
    service: moduleRef.get(CommentService),
    commentRepo,
    postRepo,
    userRepo,
  };
};

describe('CommentService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createComment', () => {
    it('rejects text longer than 500 characters', async () => {
      const { service, commentRepo } = await setup();

      await expect(
        service.createComment(AUTHOR_ID, {
          postId: POST_ID,
          text: 'x'.repeat(501),
        }),
      ).rejects.toThrow(
        new BadRequestException('Max length of comment is 500 symbols'),
      );
      expect(commentRepo.save).not.toHaveBeenCalled();
    });

    it('accepts text of exactly 500 characters', async () => {
      const { service, commentRepo } = await setup();

      await service.createComment(AUTHOR_ID, {
        postId: POST_ID,
        text: 'x'.repeat(500),
      });

      expect(commentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown post', async () => {
      const { service } = await setup({ postIds: [] });

      await expect(
        service.createComment(AUTHOR_ID, { postId: 'ghost', text: 'hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an unknown author', async () => {
      const { service } = await setup({ userIds: [] });

      await expect(
        service.createComment('ghost', { postId: POST_ID, text: 'hi' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateComment', () => {
    it('refuses to edit a comment written by somebody else', async () => {
      const comment = commentRow();
      const { service, commentRepo } = await setup({ comments: [comment] });

      await expect(
        service.updateComment('Hijacked', 'comment-1', 'someone-else'),
      ).rejects.toThrow(new ForbiddenException("You can't edit this comment"));
      expect(commentRepo.save).not.toHaveBeenCalled();
      expect(comment.text).toBe('Original text');
    });

    it('rejects new text longer than 500 characters', async () => {
      const { service, commentRepo } = await setup({
        comments: [commentRow()],
      });

      await expect(
        service.updateComment('x'.repeat(501), 'comment-1', AUTHOR_ID),
      ).rejects.toThrow(
        new BadRequestException('Max length of comment is 500 symbols'),
      );
      expect(commentRepo.save).not.toHaveBeenCalled();
    });

    it('updates the text for the author', async () => {
      const comment = commentRow();
      const { service, commentRepo } = await setup({ comments: [comment] });

      const result = await service.updateComment(
        'Edited text',
        'comment-1',
        AUTHOR_ID,
      );

      expect(result.text).toBe('Edited text');
      expect(comment.text).toBe('Edited text');
      expect(commentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown comment', async () => {
      const { service } = await setup({ comments: [] });

      await expect(
        service.updateComment('Edited', 'ghost', AUTHOR_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteComment', () => {
    it('refuses to delete a comment written by somebody else', async () => {
      const { service, commentRepo } = await setup({
        comments: [commentRow()],
      });

      await expect(
        service.deleteComment('comment-1', 'someone-else'),
      ).rejects.toThrow(
        new ForbiddenException("You can't delete this comment"),
      );
      expect(commentRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes a comment for its author', async () => {
      const { service, commentRepo } = await setup({
        comments: [commentRow()],
      });

      await expect(
        service.deleteComment('comment-1', AUTHOR_ID),
      ).resolves.toEqual({ deleted: true });
      expect(commentRepo.delete).toHaveBeenCalledWith('comment-1');
    });
  });
});
