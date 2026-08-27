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
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PostService } from './post.service';
import { R2Service } from 'src/r2.service';
import { UpdatePostDto } from './dto/update-post.dto';
import { imageUploadOptions } from 'src/common/upload.utils';
import { CreatePostDto } from './dto/create-post.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  PaginatedPostsResponseDto,
  PostViewDto,
  PublicPostDto,
  SuccessResponseDto,
  ToggleLikeResponseDto,
  ToggleSaveResponseDto,
} from 'src/common/dto/swagger-response.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Posts')
@ApiBearerAuth('access-token')
@Controller('posts')
export class PostController {
  constructor(
    private postService: PostService,
    private r2Service: R2Service,
  ) {}

  @Post('create')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiOperation({ summary: 'Create a new post with image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'description', 'image'],
      properties: {
        title: { type: 'string', maxLength: 200, example: 'My first post' },
        description: {
          type: 'string',
          maxLength: 1000,
          example: 'Some post description',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file up to 5 MB',
        },
        timeZone: { type: 'string', example: 'Europe/Kyiv' },
      },
    },
  })
  @ApiOkResponse({ type: PublicPostDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed or uploaded file is invalid' })
  async createPost(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreatePostDto,
    @Req() req,
  ) {
    const imageUrl = await this.r2Service.uploadFile(file, 'posts');

    return this.postService.createPost(
      req.user.id,
      body.title,
      body.description,
      imageUrl,
      body.timeZone,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post by id' })
  @ApiParam({ name: 'id', example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async deletePost(@Req() req, @Param('id') postId: string) {
    const result = await this.postService.deletePost(postId, req.user.id);

    if (result.image) {
      await this.r2Service.deleteFile(result.image);
    }

    return { success: result.success };
  }

  @Get('/saved')
  @ApiOperation({ summary: 'Get paginated saved posts for the current user' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  async getSavedPosts(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.postService.getSavedPosts(req.user.id, page, limit);
  }

  @Get('/all')
  @ApiOperation({ summary: 'Get paginated feed posts' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  async getAllPosts(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.postService.getAllPosts(req.user.id, page, limit);
  }

  @Get('/user/:id')
  @ApiOperation({ summary: 'Get paginated posts created by a user' })
  @ApiParam({ name: 'id', example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({ type: PaginatedPostsResponseDto })
  async getUserPosts(
    @Param('id') userId: string,
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const currentUserId = req.user.id;
    return this.postService.getUserPosts(userId, currentUserId, page, limit);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get post details by id' })
  @ApiParam({ name: 'id', example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @ApiOkResponse({ type: PostViewDto })
  @ApiBadRequestResponse({ description: 'Post id is not a valid UUID' })
  async getPostInfo(@Req() req, @Param('id', ParseUUIDPipe) postId: string) {
    return this.postService.getPostInfo(postId, req.user.id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ApiOperation({ summary: 'Update an existing post and optionally replace its image' })
  @ApiParam({ name: 'id', example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Updated title' },
        description: { type: 'string', example: 'Updated description' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Optional image file up to 5 MB',
        },
      },
    },
  })
  @ApiOkResponse({ type: PublicPostDto })
  async updatePost(
    @Param('id') postId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.updatePost(postId, dto, file);
  }

  @Post('/:id/toggle-save')
  @ApiOperation({ summary: 'Save or unsave a post for the current user' })
  @ApiParam({ name: 'id', example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @ApiOkResponse({ type: ToggleSaveResponseDto })
  async toggleSave(@Param('id') postId: string, @Req() req) {
    return this.postService.toggleSavePost(req.user.id, postId);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like or unlike a post' })
  @ApiParam({ name: 'id', example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @ApiOkResponse({ type: ToggleLikeResponseDto })
  async toggleLike(@Param('id') id: string, @Req() req) {
    return this.postService.toggleLike(id, req.user.id);
  }
}
