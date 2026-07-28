import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';
import { User } from 'src/user/entities/user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepo: Repository<Chat>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async readMessages(chatId: string, userId: string) {
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    chat.lastReadMessages = {
      ...(chat.lastReadMessages ?? {}),
      [userId]: new Date().toISOString(),
    };

    await this.chatRepo.save(chat);

    return chat;
  }

  async findChatBetween(user1: string, user2: string) {
    return this.chatRepo
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'p1', 'p1.id = :user1', { user1 })
      .innerJoin('chat.participants', 'p2', 'p2.id = :user2', { user2 })
      .leftJoinAndSelect('chat.participants', 'participants')
      .getOne();
  }

  async getUserChats(userId: string) {
    const chats = await this.chatRepo
      .createQueryBuilder('chat')
      .distinct(true)
      .leftJoin('chat.participants', 'filterParticipant')
      .leftJoinAndSelect('chat.participants', 'participants')
      .leftJoinAndSelect('chat.messages', 'messages')
      .leftJoinAndSelect('messages.sender', 'sender')
      .where('filterParticipant.id = :userId', { userId })
      .orderBy('messages.createdAt', 'DESC')
      .getMany();

    return chats
      .filter((chat) => chat.messages.length > 0)
      .map((chat) => {
        const lastReadAt = chat.lastReadMessages?.[userId];

        const unreadCount = chat.messages.filter((message) => {
          if (message.sender.id === userId) {
            return false;
          }

          if (!lastReadAt) {
            return true;
          }

          return message.createdAt > new Date(lastReadAt);
        }).length;

        return {
          ...chat,
          unreadCount,
        };
      });
  }

  async sendMessage(
    chatId: string | null,
    senderId: string,
    receiverId: string,
    text: string,
  ) {
    let chat: Chat | null = null;

    if (chatId) {
      chat = await this.chatRepo.findOne({
        where: { id: chatId },
        relations: ['participants'],
      });
    }

    if (!chat) {
      chat = await this.findChatBetween(senderId, receiverId);
    }

    if (!chat) {
      const users = await this.userRepo.find({
        where: { id: In([senderId, receiverId]) },
      });
      if (users.length < 2) {
        throw new NotFoundException('Users not found');
      }

      chat = this.chatRepo.create({ participants: users });
      chat = await this.chatRepo.save(chat);
    }

    const sender = await this.userRepo.findOne({ where: { id: senderId } });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const message = this.messageRepo.create({
      text,
      sender,
      chat,
    });

    const savedMessage = await this.messageRepo.save(message);

    const savedFullMessage = await this.messageRepo.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });

    return {
      chatId: chat.id,
      message: savedFullMessage!,
    };
  }

  async updateMessage(messageId: string, newText: string, userId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'chat'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.id !== userId)
      throw new ForbiddenException("You can't edit this message");

    if (!newText.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (message.text === newText) {
      return message;
    }

    message.text = newText;
    message.editedAt = new Date();

    return this.messageRepo.save(message);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['sender', 'chat'],
    });

    if (!message) throw new NotFoundException('Message not found');

    if (message.sender.id !== userId)
      throw new ForbiddenException("You can't delete this message");

    await this.messageRepo.delete(messageId);

    return message;
  }

  async getMessages(chatId: string) {
    return this.messageRepo.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }

  async removeChatForUser(chatId: string, userId: string) {
    const chat = await this.chatRepo.findOne({
      where: { id: chatId },
      relations: ['participants'],
    });

    if (!chat) throw new NotFoundException('Chat not found');

    if (chat.participants.length === 0) {
      await this.chatRepo.delete(chatId);
    }

    chat.participants = chat.participants.filter((p) => p.id !== userId);

    await this.chatRepo.save(chat);

    return { success: true };
  }

  async searchChats(userId: string, query: string) {
    if (!query || query.trim() === '') {
      return [];
    }

    const q = `%${query.toLowerCase()}%`;

    return this.chatRepo
      .createQueryBuilder('chat')
      .leftJoin('chat.participants', 'me', 'me.id = :userId', { userId })
      .leftJoinAndSelect('chat.participants', 'p')
      .leftJoinAndSelect('chat.messages', 'messages')
      .where('me.id IS NOT NULL')
      .andWhere('p.id != :userId', { userId })

      .andWhere(
        `
      LOWER(p.firstName) LIKE LOWER(:q) OR
      LOWER(p.lastName) LIKE LOWER(:q) OR
      LOWER(CONCAT(p.firstName, ' ', p.lastName)) LIKE LOWER(:q)
    `,
        { q },
      )
      .orderBy('messages.createdAt', 'DESC')
      .getMany();
  }
}
