import { Injectable, NotFoundException } from '@nestjs/common';
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
      image: `/uploads/posts/${image}`,
      user,
    });

    return this.postRepo.save(post);
  }

  async getUserPosts(userId: string) {
    const posts = await this.postRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts'],
    });

    if (!user) throw new NotFoundException("User wasn't found");

    const savedIds = new Set(user.savedPosts.map((p) => p.id));

    return posts.map((post) => ({
      ...post,
      isSaved: savedIds.has(post.id),
    }));
  }

  async getRandomPosts(userId: string) {
    const posts = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('RANDOM()')
      .limit(20)
      .getMany();

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts'],
    });

    if (!user) throw new NotFoundException("Post wasn't found");

    const savedIds = new Set(user.savedPosts.map((p) => p.id));

    return posts.map((post) => ({
      ...post,
      isSaved: savedIds.has(post.id),
    }));
  }

  async getSavedPosts(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts', 'savedPosts.user'],
    });

    if (!user) throw new NotFoundException('User not found');

    return user.savedPosts.map((post) => ({
      ...post,
      isSaved: true,
    }));
  }

  async getPostInfo(postId: string, userId: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    if (!post) throw new NotFoundException("Post wasn't found");

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['savedPosts'],
    });

    if (!user) throw new NotFoundException("Post wasn't found");

    const isSaved = user.savedPosts.some((p) => p.id === postId);

    return { ...post, isSaved };
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
}
