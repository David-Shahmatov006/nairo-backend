import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { ImproveTextDto } from './dto/improveText.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('improve-text')
  improveText(@Body() dto: ImproveTextDto) {
    return this.aiService.improveText(dto.text);
  }
}
