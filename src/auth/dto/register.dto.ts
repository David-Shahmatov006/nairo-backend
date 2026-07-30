import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6, maxLength: 72 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'John', minLength: 2, maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[\p{L}\s'-]+$/u)
  firstName: string;

  @ApiProperty({ example: 'Doe', minLength: 2, maxLength: 40 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[\p{L}\s'-]+$/u)
  lastName: string;

  @ApiProperty({ example: 'username', minLength: 2, maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  username: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsString()
  @IsOptional()
  language: string;
}
