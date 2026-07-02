import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PasswordReset } from './entities/password_resets.entity';
import { User } from 'src/user/entities/user.entity';
import { MailService } from './mail/mail.service';
import { ResetPasswordDto } from './dto/resetPassword.dto';

@Injectable()
export class PasswordResetsService {
  constructor(
    @InjectRepository(PasswordReset)
    private resetRepo: Repository<PasswordReset>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    private mailService: MailService,
  ) {}

  async createResetCode(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('If user exists, email was sent');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const codeHash = await bcrypt.hash(code, 10);

    await this.resetRepo.save({
      user,
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await this.mailService.sendResetCode(email, code);

    return { message: 'If user exists, email was sent' };
  }

  async verifyCode(email: string, code: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('If user exists, email was sent');
    }

    const reset = await this.resetRepo.findOne({
      where: {
        user: { id: user.id },
        usedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    if (!reset) {
      throw new BadRequestException('Invalid code');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException('Code expired');
    }

    const isValid = await bcrypt.compare(code, reset.codeHash);

    if (!isValid) {
      throw new BadRequestException('Invalid code');
    }

    const resetToken = randomBytes(32).toString('hex');

    const resetTokenHash = await bcrypt.hash(resetToken, 10);

    reset.codeHash = resetTokenHash;

    await this.resetRepo.save(reset);

    return { resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { resetToken, email, newPassword } = dto;
    const user = await this.userRepo.findOne({
      where: {
        email,
      },
    });

    if (!user) throw new BadRequestException('Invalid request');

    const reset = await this.resetRepo.findOne({
      where: {
        user: { id: user.id },
        usedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    const isValid = await bcrypt.compare(resetToken, reset?.codeHash);

    if (!isValid) {
      throw new BadRequestException('Invalid token');
    }

    if (!reset) {
      throw new BadRequestException('Invalid token');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    reset.usedAt = new Date();

    await this.userRepo.save(user);
    await this.resetRepo.save(reset);

    return { message: 'Password updated successfully!' };
  }
}
