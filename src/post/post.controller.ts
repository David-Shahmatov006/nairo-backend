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
  Query,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {} from 'multer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PostService } from './post.service';
import { R2Service } from 'src/r2.service';
import { UpdatePostDto } from './dto/update-post.dto';
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostController {
  constructor(
    private postService: PostService,
    private r2Service: R2Service,
  ) {}

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

  @Get('/saved')
  async getSavedPosts(
    @Req() req,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.postService.getSavedPosts(req.user.id, +page, +limit);
  }

  @Get('/all')
  async getAllPosts(
    @Req() req,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.postService.getAllPosts(req.user.id, +page, +limit);
  }

  @Get('/user/:id')
  async getUserPosts(
    @Param('id') userId: string,
    @Req() req,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const currentUserId = req.user.id;
    return this.postService.getUserPosts(userId, currentUserId, +page, +limit);
  }

  @Get('/:id')
  async getPostInfo(@Req() req, @Param('id') postId: string) {
    return this.postService.getPostInfo(postId, req.user.id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async updatePost(
    @Param('id') postId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.updatePost(postId, dto, file);
  }

  @Post('/:id/toggle-save')
  async toggleSave(@Param('id') postId: string, @Req() req) {
    return this.postService.toggleSavePost(req.user.id, postId);
  }

  @Post(':id/like')
  async toggleLike(@Param('id') id: string, @Req() req) {
    return this.postService.toggleLike(id, req.user.id);
  }
}
