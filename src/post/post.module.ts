import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';
import { UserModule } from 'src/user/user.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, User])
  ],
  controllers: [PostController],
  providers: [PostService],
})

export class PostModule {}
