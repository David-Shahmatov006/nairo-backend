import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AiService } from './ai.service';
import { ImproveTextDto } from './dto/improveText.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GeneratePostDto } from './dto/generatePost.dto';
import { AgentDto } from './agent/dto/agent.dto';
import { AgentService } from './agent/agent.service';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly agentService: AgentService,
  ) {}

  @Post('improve-text')
  improveText(@Body() dto: ImproveTextDto) {
    return this.aiService.improveText(dto.text);
  }

  @Post('generate-post')
  async generateFullPost(
    @Body() dto: GeneratePostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.generateFullPost(
      dto.idea,
      req.user.id,
      dto.withImage,
    );
  }

  @Post('agent/chat')
  async agentChat(@Body() body: AgentDto, @Req() req: AuthenticatedRequest) {
    return this.agentService.chat(body.message, req.user.id, body.history);
  }

  @Delete('agent/chat')
  async clearAgentChat(@Req() req: AuthenticatedRequest) {
    await this.agentService.clearHistory(req.user.id);
    return { success: true };
  }
}
