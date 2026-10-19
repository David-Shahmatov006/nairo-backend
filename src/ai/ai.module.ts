import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { R2Service } from 'src/r2.service';
import { PostModule } from 'src/post/post.module';
import { UserModule } from 'src/user/user.module';
import { AgentService } from './agent/agent.service';

@Module({
  imports: [PostModule, UserModule],
  controllers: [AiController],
  providers: [AiService, AgentService, R2Service],
})
export class AiModule {}
