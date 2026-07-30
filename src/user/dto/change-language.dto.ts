import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChangeLanguageDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  language: string;
}
