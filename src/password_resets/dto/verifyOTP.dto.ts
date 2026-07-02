import { IsEmail, IsNotEmpty, IsNumber } from 'class-validator';

export class VerifyOTPDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsNumber()
  code: string;
}
