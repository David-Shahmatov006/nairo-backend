import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { R2Service } from 'src/r2.service';
import { AchievementsService } from './achievements/achievements.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, R2Service, AchievementsService],
  exports: [TypeOrmModule, UserService, AchievementsService],
})
export class UserModule {}
