import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'new-email@example.com' })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
}
