import { IsEmail, IsNotEmpty } from "class-validator";

export class GenerateOTPDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
