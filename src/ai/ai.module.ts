import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { R2Service } from 'src/r2.service';

@Module({
  controllers: [AiController],
  providers: [AiService, R2Service],
})
export class AiModule {}
