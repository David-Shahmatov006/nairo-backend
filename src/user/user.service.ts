import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async updateProfile(userId: string, data: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (data.username && data.username !== user.username) {
      const usernameExists = await this.userRepo.findOne({
        where: { username: data.username },
      });

      if (usernameExists) {
        throw new ConflictException('Such username already exists');
      }
    }

    await this.userRepo.update(userId, data);
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async updateAvatar(userId: string, avatarPath: string) {
    await this.userRepo.update(userId, { avatar: avatarPath });
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async getUserById(id: string, currentUserId?: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['followers', 'following', 'posts'],
    });

    if (!user) throw new NotFoundException('User not found');

    let isFollowing = false;

    if (currentUserId) {
      isFollowing =
        user.followers?.some((f) => f.id === currentUserId) ?? false;
    }

    return { ...user, isFollowing };
  }

  async changeEmail(userId: string, newEmail: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    const emailExists = await this.userRepo.findOne({
      where: { email: newEmail },
    });

    if (emailExists) {
      throw new BadRequestException(
        'Such email already exists, try different one',
      );
    }

    user.email = newEmail;
    await this.userRepo.save(user);

    return user;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    return { message: 'Password changed successfully' };
  }

  async changeLanguage(userId: string, language: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.preferredLanguage = language;
    await this.userRepo.save(user);

    return user;
  }

  async toggleFollow(currentUserId: string, targetUserId: string) {
    const currentUser = await this.userRepo.findOne({
      where: { id: currentUserId },
      relations: ['following'],
    });

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: ['followers'],
    });

    if (!currentUser || !targetUser)
      throw new NotFoundException('User not found');

    // FIX: если пустые массивы — создаём их
    currentUser.following = currentUser.following ?? [];
    targetUser.followers = targetUser.followers ?? [];

    const isFollowing = currentUser.following.some(
      (u) => u.id === targetUserId,
    );

    if (isFollowing) {
      // ⛔ UNFOLLOW
      currentUser.following = currentUser.following.filter(
        (u) => u.id !== targetUserId,
      );

      targetUser.followers = targetUser.followers.filter(
        (u) => u.id !== currentUserId,
      );
    } else {
      // ✅ FOLLOW
      currentUser.following.push(targetUser);
      targetUser.followers.push(currentUser);
    }

    await this.userRepo.save(currentUser);
    await this.userRepo.save(targetUser);

    return { isFollowing: !isFollowing };
  }

  async searchUsers(query: string) {
    if (!query.trim()) return [];

    return this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.firstName',
        'user.lastName',
        'user.avatar',
      ])
      .where('user.username ILIKE :q', { q: `%${query}%` })
      .orWhere('user.firstName ILIKE :q', { q: `%${query}%` })
      .orWhere('user.lastName ILIKE :q', { q: `%${query}%` })
      .limit(20)
      .getMany();
  }

  async checkUserFields(dto: { email: string; username: string }) {
    const emailExists = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    const usernameExists = await this.userRepo.findOne({
      where: { username: dto.username },
    });

    return {
      emailExists: !!emailExists,
      usernameExists: !!usernameExists,
    };
  }
}
