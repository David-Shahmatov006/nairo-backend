import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { extname } from 'path';
import { PostService } from './post.service';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/posts',
        filename: (_, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
    }),
  )
  createPost(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description: string },
    @Req() req,
  ) {
    return this.postService.createPost(
      req.user.id,
      body.title,
      body.description,
      file.filename,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/saved')
  async getSavedPosts(@Req() req) {
    return this.postService.getSavedPosts(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/random')
  async getRandomPosts(@Req() req) {
    return this.postService.getRandomPosts(req.user.id);
  }

  @Get('/user/:id')
  async getUserPosts(@Param('id') id: string) {
    return this.postService.getUserPosts(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  async getPostInfo(@Req() req, @Param('id') postId: string) {
    return this.postService.getPostInfo(postId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:id/toggle-save')
  async toggleSave(@Param('id') postId: string, @Req() req) {
    return this.postService.toggleSavePost(req.user.id, postId);
  }
}
