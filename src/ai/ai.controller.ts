import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AiService } from './ai.service';
import { ImproveTextDto } from './dto/improveText.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GeneratePostDto } from './dto/generatePost.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
