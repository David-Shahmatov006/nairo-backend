import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { PasswordResetsService } from './password_resets.service';
import { GenerateOTPDto } from './dto/generateOTP.dto';
import { VerifyOTPDto } from './dto/verifyOTP.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  MessageResponseDto,
  ResetTokenResponseDto,
} from 'src/common/dto/swagger-response.dto';

@ApiTags('Password Reset')
@Controller('password-reset')
export class PasswordResetsController {
  constructor(private readonly passwordResetsService: PasswordResetsService) {}

  @UseGuards(ThrottlerGuard)
  @Post('generate-otp')
  @ApiOperation({ summary: 'Generate and send a password reset OTP' })
  @ApiBody({ type: GenerateOTPDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async generateOTP(@Body() dto: GenerateOTPDto) {
    return this.passwordResetsService.createResetCode(dto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify the OTP and issue a password reset token' })
  @ApiBody({ type: VerifyOTPDto })
  @ApiOkResponse({ type: ResetTokenResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or code is incorrect' })
  async verifyOTP(@Body() dto: VerifyOTPDto) {
    return this.passwordResetsService.verifyCode(dto.email, dto.code);
  }

  @Patch('/reset')
  @ApiOperation({ summary: 'Reset password using a reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or reset token is invalid' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetsService.resetPassword(dto);
  }
}
