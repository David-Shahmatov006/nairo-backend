import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { UpdatePostDto } from './dto/update-post.dto';
import { R2Service } from 'src/r2.service';
import { clampPagination } from 'src/common/upload.utils';
import { AchievementsService } from 'src/user/achievements/achievements.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private r2Service: R2Service,
    private achievementsService: AchievementsService,
  ) {}

  private async getViewerFlags(userId: string, postIds: string[]) {
    if (!postIds.length) {
      return {
        savedIds: new Set<string>(),
        likedIds: new Set<string>(),
      };
    }

    const [savedRows, likedRows]: [
      Array<{ postId: string }>,
      Array<{ postId: string }>,
    ] = await Promise.all([
      this.userRepo.query(
        `
          SELECT "postId"
          FROM user_saved_posts_post
          WHERE "userId" = $1 AND "postId" = ANY($2)
        `,
        [userId, postIds],
      ),
      this.userRepo.query(
        `
          SELECT "postId"
          FROM user_liked_posts_post
          WHERE "userId" = $1 AND "postId" = ANY($2)
        `,
        [userId, postIds],
      ),
    ]);

    return {
      savedIds: new Set(savedRows.map((row) => row.postId)),
      likedIds: new Set(likedRows.map((row) => row.postId)),
    };
  }

  private async getLikesCountMap(postIds: string[]) {
    if (!postIds.length) {
      return new Map<string, number>();
    }

    const rows: Array<{ postId: string; count: string }> =
      await this.postRepo.query(
        `
          SELECT "postId", COUNT(*)::int AS count
          FROM user_liked_posts_post
          WHERE "postId" = ANY($1)
          GROUP BY "postId"
        `,
        [postIds],
      );

    return new Map(rows.map((row) => [row.postId, Number(row.count)]));
  }

  async createPost(
    userId: string,
    title: string,
    description: string,
    image: string,
    timeZone?: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException("User wasn't found");

    if (title?.length > 200) {
      throw new BadRequestException('Max length of title is 200 symbols');
    }

    if (description?.length > 1000) {
      throw new BadRequestException('Max length of description is 200 symbols');
    }

    const post = this.postRepo.create({
      title,
      description,
      image,
      user,
    });

    const savedPost = await this.postRepo.save(post);
    const granted = await this.achievementsService.evaluateNightOwl(
      userId,
      savedPost.createdAt,
      timeZone,
    );

    return {
      ...savedPost,
      newlyUnlocked: granted ? (['night_owl'] as const) : [],
    };
  }

  async updatePost(
    postId: string,
    dto: UpdatePostDto,
    file?: Express.Multer.File,
  ) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException("Post was'nt found");
    }

    if (dto.title?.length! > 200) {
      throw new BadRequestException('Max length of title is 200 symbols');
    }

    if (dto.description?.length! > 1000) {
      throw new BadRequestException('Max length of description is 200 symbols');
    }

    post.title = dto.title as string;
    post.description = dto.description as string;

    if (file) {
      const imageUrl = await this.r2Service.uploadFile(file, 'posts');
      post.image = imageUrl;
    }

    return this.postRepo.save(post);
  }

  async getUserPosts(
    userId: string,
    currentUserId: string,
    page: number,
    limit: number,
  ) {
    const { page: safePage, limit: safeLimit } = clampPagination(page, limit);

    const posts = await this.postRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    const postIds = posts.map((post) => post.id);
    const [{ savedIds, likedIds }, likesMap] = await Promise.all([
      this.getViewerFlags(currentUserId, postIds),
      this.getLikesCountMap(postIds),
    ]);

    const data = posts.map((post) => ({
      ...post,
      isSaved: savedIds.has(post.id),
      isLiked: likedIds.has(post.id),
      likes: likesMap.get(post.id) ?? 0,
    }));

    return {
      posts: data,
      hasMore: data.length === safeLimit,
    };
  }

  async getAllPosts(userId: string, page: number, limit: number) {
    const { page: safePage, limit: safeLimit } = clampPagination(page, limit);

    const posts = await this.postRepo
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .orderBy('post.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const postIds = posts.map((post) => post.id);
    const [{ savedIds, likedIds }, likesMap] = await Promise.all([
      this.getViewerFlags(userId, postIds),
      this.getLikesCountMap(postIds),
    ]);

    const data = posts.map((post) => ({
      ...post,
      isSaved: savedIds.has(post.id),
      isLiked: likedIds.has(post.id),
      likes: likesMap.get(post.id) ?? 0,
    }));

    return {
      posts: data,
      hasMore: data.length === safeLimit,
    };
  }

  async getSavedPosts(userId: string, page: number, limit: number) {
    const { page: safePage, limit: safeLimit } = clampPagination(page, limit);

    const posts = await this.postRepo
      .createQueryBuilder('post')
      .innerJoin('post.savedBy', 'savedBy', 'savedBy.id = :userId', { userId })
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('post.createdAt', 'DESC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getMany();

    const postIds = posts.map((post) => post.id);
    const [{ likedIds }, likesMap] = await Promise.all([
      this.getViewerFlags(userId, postIds),
      this.getLikesCountMap(postIds),
    ]);

    const data = posts.map((post) => ({
      ...post,
      isSaved: true,
      isLiked: likedIds.has(post.id),
      likes: likesMap.get(post.id) ?? 0,
    }));

    return {
      posts: data,
      hasMore: data.length === safeLimit,
    };
  }

  async getPostInfo(postId: string, userId: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    if (!post) throw new NotFoundException("Post wasn't found");

    const [{ savedIds, likedIds }, likesMap] = await Promise.all([
      this.getViewerFlags(userId, [postId]),
      this.getLikesCountMap([postId]),
    ]);

    return {
      ...post,
      isSaved: savedIds.has(postId),
      isLiked: likedIds.has(postId),
      likes: likesMap.get(postId) ?? 0,
    };
  }

  async toggleSavePost(userId: string, postId: string) {
    const [user, post] = await Promise.all([
      this.userRepo.findOne({
        where: { id: userId },
        relations: ['savedPosts'],
      }),
      this.postRepo.findOne({ where: { id: postId } }),
    ]);

    if (!user || !post) throw new NotFoundException('Not found');

    const alreadySaved = user.savedPosts.some((p) => p.id === postId);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter((p) => p.id !== postId);
      post.savings--;
    } else {
      user.savedPosts.push(post);
      post.savings++;
    }

    await Promise.all([this.postRepo.save(post), this.userRepo.save(user)]);

    return { saved: !alreadySaved };
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['likedBy'],
    });

    if (!post) throw new NotFoundException('Post not found');

    const alreadyLiked = post.likedBy.some((u) => u.id === userId);

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter((u) => u.id !== userId);
    } else {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      post.likedBy.push(user);
    }

    await this.postRepo.save(post);

    return {
      isLiked: !alreadyLiked,
      likes: post.likedBy.length,
    };
  }

  async deletePost(postId: string, userId: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    if (!post) throw new NotFoundException('Post not found');

    if (post.user.id !== userId) {
      throw new ForbiddenException('You cannot delete this post');
    }

    const image = post.image;
    await this.postRepo.remove(post);

    return { success: true, image };
  }
}
