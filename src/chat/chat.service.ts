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
      .innerJoin(
        'chat.participants',
        'filterParticipant',
        'filterParticipant.id = :userId',
        { userId },
      )
      .innerJoin('chat.messages', 'hasMessages')
      .leftJoinAndSelect('chat.participants', 'participants')
      .distinct(true)
      .getMany();

    if (!chats.length) {
      return [];
    }

    const chatIds = chats.map((chat) => chat.id);

    const unreadRows: Array<{ chatId: string; count: string }> =
      await this.messageRepo.query(
        `
          SELECT m."chatId" AS "chatId", COUNT(*)::int AS count
          FROM message m
          INNER JOIN chat c ON c.id = m."chatId"
          WHERE m."chatId" = ANY($1)
            AND m."senderId" != $2
            AND (
              c."lastReadMessages"->>($2::text) IS NULL
              OR m."createdAt" > ((c."lastReadMessages"->>($2::text))::timestamptz)
            )
          GROUP BY m."chatId"
        `,
        [chatIds, userId],
      );

    const unreadMap = new Map(
      unreadRows.map((row) => [row.chatId, Number(row.count)]),
    );

    return chats.map((chat) => ({
      ...chat,
      unreadCount: unreadMap.get(chat.id) ?? 0,
    }));
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
        select: ['id', 'username', 'firstName', 'lastName', 'avatar', 'email'],
      });
      if (users.length < 2) {
        throw new NotFoundException('Users not found');
      }

      chat = this.chatRepo.create({ participants: users });
      chat = await this.chatRepo.save(chat);
    }

    const sender = await this.userRepo.findOne({
      where: { id: senderId },
      select: ['id', 'username', 'firstName', 'lastName', 'avatar', 'email'],
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const message = this.messageRepo.create({
      text,
      sender,
      chat,
    });

    const savedMessage = await this.messageRepo.save(message);

    return {
      chatId: chat.id,
      message: savedMessage,
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

    chat.participants = chat.participants.filter((p) => p.id !== userId);

    if (chat.participants.length === 0) {
      await this.chatRepo.delete(chatId);
      return { success: true };
    }

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
      .innerJoin('chat.participants', 'me', 'me.id = :userId', { userId })
      .leftJoinAndSelect('chat.participants', 'p')
      .andWhere('p.id != :userId', { userId })
      .andWhere(
        `
      LOWER(p.firstName) LIKE LOWER(:q) OR
      LOWER(p.lastName) LIKE LOWER(:q) OR
      LOWER(CONCAT(p.firstName, ' ', p.lastName)) LIKE LOWER(:q)
    `,
        { q },
      )
      .distinct(true)
      .take(20)
      .getMany();
  }
}
