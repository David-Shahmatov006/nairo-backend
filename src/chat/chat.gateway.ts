import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { NotFoundException } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chats',
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    payload: {
      chatId: string | null;
      text: string;
      senderId: string;
      receiverId: string;
    },
  ) {
    const result = await this.chatService.sendMessage(
      payload.chatId ?? null,
      payload.senderId,
      payload.receiverId,
      payload.text,
    );

    const saved = result.message;

    if (!saved) throw new NotFoundException('Message not found');

    const messageToSend = {
      id: saved.id,
      chatId: result.chatId,
      text: saved.text,
      senderId: saved.sender.id,
      time: saved.createdAt.toISOString(),
    };

    this.server.to(result.chatId).emit('receiveMessage', messageToSend);
    this.server.emit('newActivity', { chatId: result.chatId });
  }

  @SubscribeMessage('joinChat')
  handleJoinChat(
    @MessageBody() payload: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(payload.chatId);
    console.log(`Client ${client.id} joined room ${payload.chatId}`);
  }

  @SubscribeMessage('leaveChat')
  handleLeaveChat(
    @MessageBody() payload: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(payload.chatId);
    console.log(`Client ${client.id} left room ${payload.chatId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody()
    payload: {
      chatId: string;
      userId: string;
      isTyping: boolean;
    },
  ) {
    this.server.to(payload.chatId).emit('typingStatus', {
      userId: payload.userId,
      isTyping: payload.isTyping,
    });
  }
}
