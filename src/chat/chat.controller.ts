import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('user/:targetId')
  async getChatWithUser(
    @Req() req: AuthenticatedRequest,
    @Param('targetId') targetId: string,
  ) {
    const currentUserId = req.user.id;
    const [user1, user2] = [currentUserId, targetId].sort();

    return this.chatService.findChatBetween(user1, user2);
  }

  @Get('find/:targetId')
  async findChat(
    @Req() req: AuthenticatedRequest,
    @Param('targetId') targetId: string,
  ) {
    const currentUserId = req.user.id;
    const [u1, u2] = [currentUserId, targetId].sort();
    return await this.chatService.findChatBetween(u1, u2);
  }

  @Get()
  async getUserChats(@Req() req) {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get('/:chatId/messages')
  async getMessages(@Param('chatId') chatId: string) {
    return this.chatService.getMessages(chatId);
  }

  @Delete(':chatId')
  async removeChat(@Param('chatId') chatId: string, @Req() req) {
    const userId = req.user.id;
    return this.chatService.removeChatForUser(chatId, userId);
  }
}
