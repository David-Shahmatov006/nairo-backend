import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
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
import { audioUploadOptions } from 'src/common/upload.utils';
import { R2Service } from 'src/r2.service';
import { SendVoiceMessageDto } from './dto/send-voice-message.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

const VOICE_MESSAGES_FOLDER = 'voice-messages';

@UseGuards(JwtAuthGuard)
@ApiTags('Chats')
@ApiBearerAuth('access-token')
@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
    private readonly r2Service: R2Service,
  ) {}

  @Post('voice')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('audio', audioUploadOptions))
  @ApiOperation({ summary: 'Send a voice message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SendVoiceMessageDto })
  @ApiCreatedResponse({ type: MessageDto })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
  async sendVoiceMessage(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendVoiceMessageDto,
  ) {
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    const senderId = req.user.id;

    if (senderId === dto.receiverId) {
      throw new BadRequestException("You can't message yourself");
    }

    const audioUrl = await this.r2Service.uploadAudioFile(
      file,
      VOICE_MESSAGES_FOLDER,
    );

    try {
      const result = await this.chatService.sendMessage(
        dto.chatId ?? null,
        senderId,
        dto.receiverId,
        {
          type: 'voice',
          audioUrl,
          durationMs: dto.durationMs,
          waveform: dto.waveform,
        },
      );

      return this.chatGateway.broadcastNewMessage(
        result.chatId,
        result.message,
        senderId,
        dto.receiverId,
      );
    } catch (error) {
      await this.r2Service.deleteFile(audioUrl);
      throw error;
    }
  }

  @Post('user/:targetId')
  @ApiOperation({ summary: 'Get an existing chat with a target user' })
  @ApiParam({
    name: 'targetId',
    example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a',
  })
  @ApiOkResponse({ type: ChatDto, nullable: true })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
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
  @ApiParam({
    name: 'targetId',
    example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a',
  })
  @ApiOkResponse({ type: ChatDto, nullable: true })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
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
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
  async getUserChats(@Req() req) {
    return this.chatService.getUserChats(req.user.id);
  }

  @Get('/:chatId/messages')
  @ApiOperation({ summary: 'Get all messages for a chat' })
  @ApiParam({ name: 'chatId', example: '31d7a49b-9771-403e-af65-36d4f08b4d19' })
  @ApiOkResponse({ type: MessageDto, isArray: true })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
  async getMessages(@Param('chatId') chatId: string) {
    return this.chatService.getMessages(chatId);
  }

  @Delete(':chatId')
  @ApiOperation({ summary: 'Remove the current user from a chat' })
  @ApiParam({ name: 'chatId', example: '31d7a49b-9771-403e-af65-36d4f08b4d19' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
  async removeChat(@Param('chatId') chatId: string, @Req() req) {
    const userId = req.user.id;
    return this.chatService.removeChatForUser(chatId, userId);
  }
}
