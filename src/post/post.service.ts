import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async createPost(
    userId: string,
    title: string,
    description: string,
    image: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException("User wasn't found");

    const post = this.postRepo.create({
      title,
      description,
      image: image,
      user,
    });

    return this.postRepo.save(post);
  }

  async getUserPosts(userId: string, currentUserId: string) {
    const posts = await this.postRepo.find({
      where: { user: { id: userId } },
      relations: ['user', 'likedBy'],
      order: { createdAt: 'DESC' },
    });

    const viewer = await this.userRepo.findOne({
      where: { id: currentUserId },
      relations: ['savedPosts', 'likedPosts'],
    });

    if (!viewer) throw new NotFoundException('Viewer not found');

    const savedIds = new Set(viewer.savedPosts.map((p) => p.id));
    const likedIds = new Set(viewer.likedPosts.map((p) => p.id));

    return posts.map((post) => ({
      ...post,
      isSaved: savedIds.has(post.id),
      isLiked: likedIds.has(post.id),
      likes: post.likedBy.length,
    }));
  }

  async getRandomPosts(userId: string) {
    const posts = await this.postRepo
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.likedBy', 'likedBy')
      .orderBy('RANDOM()')
      .limit(20)
      .getMany();

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts', 'likedPosts', 'savedPosts.likedBy'],
    });

    if (!user) throw new NotFoundException("Post wasn't found");

    const savedIds = new Set(user.savedPosts.map((p) => p.id));
    const likedIds = new Set(user.likedPosts.map((p) => p.id));

    return posts.map((post) => ({
      ...post,
      isSaved: savedIds.has(post.id),
      isLiked: likedIds.has(post.id),
      likes: post.likedBy.length,
    }));
  }

  async getSavedPosts(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: [
        'savedPosts',
        'savedPosts.user',
        'likedPosts',
        'savedPosts.likedBy',
      ],
    });

    if (!user) throw new NotFoundException('User not found');
    const likedIds = new Set(user.likedPosts.map((p) => p.id));

    return user.savedPosts.map((post) => ({
      ...post,
      isLiked: likedIds.has(post.id),
      isSaved: true,
      likes: post.likedBy.length,
    }));
  }

  async getPostInfo(postId: string, userId: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user', 'likedBy'],
    });

    if (!post) throw new NotFoundException("Post wasn't found");

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts', 'likedPosts'],
    });

    if (!user) throw new NotFoundException('User not found');

    const isSaved = user.savedPosts.some((p) => p.id === postId);
    const isLiked = post.likedBy.some((u) => u.id === userId);

    return {
      ...post,
      isSaved,
      isLiked,
      likes: post.likedBy.length,
    };
  }

  async toggleSavePost(userId: string, postId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts'],
    });
    const post = await this.postRepo.findOne({ where: { id: postId } });

    if (!user || !post) throw new NotFoundException('Not found');

    const alreadySaved = user.savedPosts.some((p) => p.id === postId);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter((p) => p.id !== postId);
      post.savings--;
    } else {
      user.savedPosts.push(post);
      post.savings++;
    }

    await this.postRepo.save(post);
    await this.userRepo.save(user);

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

    const updatedPost = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['likedBy'],
    });

    if (!updatedPost) throw new NotFoundException('Post not found');

    return {
      isLiked: !alreadyLiked,
      likes: updatedPost.likedBy.length,
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

    await this.postRepo.remove(post);

    return { success: true };
  }
}
