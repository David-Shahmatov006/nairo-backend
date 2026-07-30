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

  @Column({
    select: false,
  })
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ default: 'en' })
  preferredLanguage: string;

  @ManyToMany(() => User, (user) => user.following, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'user_followers_user',
  })
  followers: User[];

  @ManyToMany(() => User, (user) => user.followers, { onDelete: 'CASCADE' })
  following: User[];

  @ManyToMany(() => Post, (user) => user.savedBy, { eager: false })
  @JoinTable()
  savedPosts: Post[];

  @ManyToMany(() => Post, (post) => post.likedBy)
  @JoinTable()
  likedPosts: Post[];

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}
