import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interest } from './entities/interest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Interest])],
  exports: [TypeOrmModule],
})
export class InterestsModule {}
