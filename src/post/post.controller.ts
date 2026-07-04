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
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { extname } from 'path';
import { PostService } from './post.service';
import { R2Service } from 'src/r2.service';

@Controller('posts')
export class PostController {
  constructor(
    private postService: PostService,
    private r2Service: R2Service,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  @UseInterceptors(FileInterceptor('image'))
  async createPost(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description: string },
    @Req() req,
  ) {
    const imageUrl = await this.r2Service.uploadFile(file, 'posts');

    return this.postService.createPost(
      req.user.id,
      body.title,
      body.description,
      imageUrl,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(@Req() req, @Param('id') postId: string) {
    const userId = req.user.id;
    const post = await this.postService.getPostInfo(postId, userId);
    const result = await this.postService.deletePost(postId, userId);

    if (post && post.image) {
      await this.r2Service.deleteFile(post.image);
    }

    return result;
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

  @UseGuards(JwtAuthGuard)
  @Get('/user/:id')
  async getUserPosts(@Param('id') userId: string, @Req() req) {
    const currentUserId = req.user.id;
    return this.postService.getUserPosts(userId, currentUserId);
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

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async toggleLike(@Param('id') id: string, @Req() req) {
    return this.postService.toggleLike(id, req.user.id);
  }
}
