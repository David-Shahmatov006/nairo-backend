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

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createComment(@Req() req, @Body() dto: CreateCommentDto) {
    return this.commentService.createComment(req.user.id, dto);
  }

  @Get('/:id')
  async getPostComments(@Param('id') postId: string) {
    return this.commentService.getPostComments(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:id')
  async deleteComment(@Param('id') commentId: string, @Req() req) {
    return this.commentService.deleteComment(commentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/:id')
  async updateComment(
    @Req() req,
    @Body('newText') newText: string,
    @Param('id') commentId: string,
  ) {
    return this.commentService.updateComment(newText, commentId, req.user.id);
  }
}
