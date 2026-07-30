import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResetsService } from './password_resets.service';
import { PasswordResetsController } from './password_resets.controller';
import { User } from 'src/user/entities/user.entity';
import { MailService } from './mail/mail.service';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule],
  controllers: [PasswordResetsController],
  providers: [PasswordResetsService, MailService],
})
export class PasswordResetsModule {}
