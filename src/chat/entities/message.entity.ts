import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Chat } from './chat.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => Chat, (chat) => chat.messages)
  chat: Chat;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    default: null,
  })
  editedAt: Date | null;
}
