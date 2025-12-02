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

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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
}
