import { Interest } from 'src/interests/entities/interest.entity';
import { Post } from 'src/post/entities/post.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ type: 'int', default: 0 })
  nairoBalance: number;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: 'en' })
  preferredLanguage: string;

  @ManyToMany(() => Interest, (interest) => interest.users, {
    cascade: true,
  })
  @JoinTable()
  interests: Interest[];

  @ManyToMany(() => Post, { eager: false })
  @JoinTable()
  savedPosts: Post[];

  @ManyToMany(() => Post, (post) => post.likedBy)
  likedPosts: Post[];

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}
