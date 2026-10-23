import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AgentHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(20000)
  content: string;
}

export class AgentDto {
  @IsOptional()
  @IsBoolean()
  musicAvailable?: boolean;

  @IsOptional()
  @IsBoolean()
  musicEnabled?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => AgentHistoryMessageDto)
  history?: AgentHistoryMessageDto[];
}
