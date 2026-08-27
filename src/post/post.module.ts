import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { UserModule } from 'src/user/user.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { User } from 'src/user/entities/user.entity';
import { R2Service } from 'src/r2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, User]),
    UserModule,
  ],
  controllers: [PostController],
  providers: [PostService, R2Service],
})

export class PostModule {}
