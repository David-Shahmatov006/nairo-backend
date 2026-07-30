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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ChatDto,
  ChatWithUnreadCountDto,
  MessageDto,
  SuccessResponseDto,
} from 'src/common/dto/swagger-response.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@ApiTags('Chats')
@ApiBearerAuth('access-token')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('user/:targetId')
  @ApiOperation({ summary: 'Get an existing chat with a target user' })
  @ApiParam({ name: 'targetId', example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @ApiOkResponse({ type: ChatDto, nullable: true })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async getChatWithUser(
    @Req() req: AuthenticatedRequest,
    @Param('targetId') targetId: string,
  ) {
    const currentUserId = req.user.id;
    const [user1, user2] = [currentUserId, targetId].sort();

    return this.chatService.findChatBetween(user1, user2);
  }

  @Get('find/:targetId')
  @ApiOperation({ summary: 'Find a chat with a target user' })
  @ApiParam({ name: 'targetId', example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @ApiOkResponse({ type: ChatDto, nullable: true })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async findChat(
    @Req() req: AuthenticatedRequest,
    @Param('targetId') targetId: string,
  ) {
    const currentUserId = req.user.id;
    const [u1, u2] = [currentUserId, targetId].sort();
    return await this.chatService.findChatBetween(u1, u2);
  }

  @Get()
  @ApiOperation({ summary: 'Get all chats for the current user' })
  @ApiOkResponse({ type: ChatWithUnreadCountDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async getUserChats(@Req() req) {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get('/:chatId/messages')
  @ApiOperation({ summary: 'Get all messages for a chat' })
  @ApiParam({ name: 'chatId', example: '31d7a49b-9771-403e-af65-36d4f08b4d19' })
  @ApiOkResponse({ type: MessageDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async getMessages(@Param('chatId') chatId: string) {
    return this.chatService.getMessages(chatId);
  }

  @Delete(':chatId')
  @ApiOperation({ summary: 'Remove the current user from a chat' })
  @ApiParam({ name: 'chatId', example: '31d7a49b-9771-403e-af65-36d4f08b4d19' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async removeChat(@Param('chatId') chatId: string, @Req() req) {
    const userId = req.user.id;
    return this.chatService.removeChatForUser(chatId, userId);
  }
}
