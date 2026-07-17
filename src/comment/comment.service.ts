import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/post/entities/post.entity';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/createComment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    @InjectRepository(Post)
    private postRepo: Repository<Post>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async createComment(userId: string, dto: CreateCommentDto) {
    const post = await this.postRepo.findOne({
      where: { id: dto.postId },
    });

    if (!post) throw new NotFoundException('Post not found');

    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    if (dto.text.length > 500)
      throw new BadRequestException('Max length of comment is 500 symbols');

    const comment = this.commentRepo.create({
      text: dto.text,
      post,
      user,
    });

    return this.commentRepo.save(comment);
  }

  async getPostComments(postId: string) {
    return this.commentRepo.find({
      where: { post: { id: postId } },
      relations: ['user', 'post', 'post.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) throw new NotFoundException('Comment not found');

    await this.commentRepo.delete(commentId);
    return { deleted: true };
  }

  async updateComment(newText: string, commentId: string) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
    });

    if (!comment) throw new NotFoundException('Comment not found');
    
    if (newText.length > 500)
      throw new BadRequestException('Max length of comment is 500 symbols');

    comment.text = newText;

    await this.commentRepo.save(comment);

    return comment;
  }
}
