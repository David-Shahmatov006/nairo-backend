import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { User } from 'src/user/entities/user.entity';
import { MailService } from './mail/mail.service';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { RedisService } from 'src/redis/redis.service';

const OTP_TTL_SECONDS = 10 * 60;
const RESET_TOKEN_TTL_SECONDS = 10 * 60;

type PasswordResetOtpPayload = {
  userId: string;
  email: string;
  codeHash: string;
};

@Injectable()
export class PasswordResetsService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  private getOtpKey(userId: string) {
    return `password-reset:otp:${userId}`;
  }

  private getResetTokenKey(userId: string) {
    return `password-reset:token:${userId}`;
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async createResetCode(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('If user exists, email was sent');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const codeHash = await bcrypt.hash(code, 10);

    await this.redisService.del(this.getResetTokenKey(user.id));
    await this.redisService.setJson(this.getOtpKey(user.id), {
      userId: user.id,
      email: user.email,
      codeHash,
    } satisfies PasswordResetOtpPayload, OTP_TTL_SECONDS);

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

    const otpKey = this.getOtpKey(user.id);
    const otpPayload =
      await this.redisService.getJson<PasswordResetOtpPayload>(otpKey);

    if (!otpPayload || otpPayload.email !== user.email) {
      throw new BadRequestException('Invalid code');
    }

    const isValid = await bcrypt.compare(code, otpPayload.codeHash);

    if (!isValid) {
      throw new BadRequestException('Invalid code');
    }

    await this.redisService.del(otpKey);

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenHash = this.hashResetToken(resetToken);

    await this.redisService.set(
      this.getResetTokenKey(user.id),
      resetTokenHash,
      RESET_TOKEN_TTL_SECONDS,
    );

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

    const resetTokenHash = this.hashResetToken(resetToken);
    const tokenWasConsumed = await this.redisService.consumeIfMatches(
      this.getResetTokenKey(user.id),
      resetTokenHash,
    );

    if (!tokenWasConsumed) {
      throw new BadRequestException('Invalid token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await this.userRepo.save(user);

    return { message: 'Password updated successfully!' };
  }
}
