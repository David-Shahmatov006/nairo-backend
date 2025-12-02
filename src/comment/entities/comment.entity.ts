import { IsNotEmpty } from 'class-validator';
import { Post } from 'src/post/entities/post.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  text: string;

  @ManyToOne(() => Post, (post) => post.comments)
  post: Post;
}
