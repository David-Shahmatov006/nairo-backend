import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VisitDto {
  @ApiProperty({ example: 'Europe/Kyiv' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timeZone: string;
}
