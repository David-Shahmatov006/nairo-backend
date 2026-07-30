import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateCommentDto } from './dto/createComment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CommentDto,
  DeleteCommentResponseDto,
} from 'src/common/dto/swagger-response.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiBody({ type: CreateCommentDto })
  @ApiOkResponse({ type: CommentDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async createComment(@Req() req, @Body() dto: CreateCommentDto) {
    return this.commentService.createComment(req.user.id, dto);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get all comments for a post' })
  @ApiParam({ name: 'id', example: '08c87441-7cc8-4a9a-8bb8-dfd7a6a66d48' })
  @ApiOkResponse({ type: CommentDto, isArray: true })
  async getPostComments(@Param('id') postId: string) {
    return this.commentService.getPostComments(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a comment by id' })
  @ApiParam({ name: 'id', example: '78ea8c79-3101-4474-a547-0f35fe9d0a30' })
  @ApiOkResponse({ type: DeleteCommentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async deleteComment(@Param('id') commentId: string, @Req() req) {
    return this.commentService.deleteComment(commentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a comment text' })
  @ApiParam({ name: 'id', example: '78ea8c79-3101-4474-a547-0f35fe9d0a30' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiOkResponse({ type: CommentDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async updateComment(
    @Req() req,
    @Body() dto: UpdateCommentDto,
    @Param('id') commentId: string,
  ) {
    return this.commentService.updateComment(dto.newText, commentId, req.user.id);
  }
}
