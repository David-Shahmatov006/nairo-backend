import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { PasswordResetsService } from './password_resets.service';
import { GenerateOTPDto } from './dto/generateOTP.dto';
import { VerifyOTPDto } from './dto/verifyOTP.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('password-reset')
export class PasswordResetsController {
  constructor(private readonly passwordResetsService: PasswordResetsService) {}

  @UseGuards(ThrottlerGuard)
  @Post('generate-otp')
  async generateOTP(@Body() dto: GenerateOTPDto) {
    return this.passwordResetsService.createResetCode(dto.email);
  }

  @Post('verify-otp')
  async verifyOTP(@Body() dto: VerifyOTPDto) {
    return this.passwordResetsService.verifyCode(dto.email, dto.code);
  }

  @Patch('/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetsService.resetPassword(dto);
  }
}
