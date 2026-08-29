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
import { Message } from './entities/message.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chats',
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}
  private openedChats = new Map<string, string>();

  @SubscribeMessage('connectUser')
  handleConnectUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    client.join(`user:${payload.userId}`);
  }

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
      { type: 'text', text: payload.text },
    );

    const saved = result.message;

    if (!saved) throw new NotFoundException('Message not found');

    await this.broadcastNewMessage(
      result.chatId,
      saved,
      payload.senderId,
      payload.receiverId,
    );
  }

  async broadcastNewMessage(
    chatId: string,
    message: Message,
    senderId: string,
    receiverId: string,
  ) {
    const messageToSend = {
      id: message.id,
      chatId,
      type: message.type,
      text: message.text,
      audioUrl: message.audioUrl,
      durationMs: message.durationMs,
      waveform: message.waveform,
      sender: message.sender,
      createdAt: message.createdAt.toISOString(),
    };

    const receiverSockets = await this.server
      .in(`user:${receiverId}`)
      .fetchSockets();

    const receiverIsInChat = receiverSockets.some((socket) =>
      socket.rooms.has(chatId),
    );

    if (receiverIsInChat) {
      await this.chatService.readMessages(chatId, receiverId);
    }

    this.server.to(chatId).emit('receiveMessage', messageToSend);

    this.server.to(`user:${receiverId}`).emit('newMessageNotification', {
      ...messageToSend,
      unread: true,
    });

    this.server
      .to(`user:${senderId}`)
      .to(`user:${receiverId}`)
      .emit('newActivity', { chatId });

    return messageToSend;
  }

  @SubscribeMessage('readMessages')
  async handleReadMessages(
    @MessageBody()
    payload: {
      chatId: string;
      userId: string;
    },
  ) {
    const chat = await this.chatService.readMessages(
      payload.chatId,
      payload.userId,
    );

    this.server.to(payload.chatId).emit('messagesRead', {
      userId: payload.userId,
      chatId: payload.chatId,
      lastReadAt: chat.lastReadMessages[payload.userId],
    });
  }

  @SubscribeMessage('updateMessage')
  async handleUpdateMessage(
    @MessageBody()
    payload: {
      messageId: string;
      newText: string;
      userId: string;
    },
  ) {
    const message = await this.chatService.updateMessage(
      payload.messageId,
      payload.newText,
      payload.userId,
    );

    this.server.to(message.chat.id).emit('messageUpdated', {
      messageId: message.id,
      text: message.text,
      editedAt: message.editedAt,
    });
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody()
    payload: {
      messageId: string;
      userId: string;
    },
  ) {
    const message = await this.chatService.deleteMessage(
      payload.messageId,
      payload.userId,
    );

    this.server
      .to(message.chat.id)
      .emit('messageDeleted', { messageId: message.id });
  }

  @SubscribeMessage('joinChat')
  handleJoinChat(
    @MessageBody() payload: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(payload.chatId);

    this.openedChats.set(client.id, payload.chatId);
  }

  @SubscribeMessage('leaveChat')
  handleLeaveChat(
    @MessageBody() payload: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(payload.chatId);

    this.openedChats.delete(client.id);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client,
    @MessageBody()
    payload: {
      chatId: string;
      userId: string;
      isTyping: boolean;
    },
  ) {
    client.broadcast.to(payload.chatId).emit('typingStatus', {
      userId: payload.userId,
      isTyping: payload.isTyping,
    });
  }
}
