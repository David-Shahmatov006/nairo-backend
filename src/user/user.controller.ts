import {
  Controller,
  UseInterceptors,
  UploadedFile,
  Post,
  UseGuards,
  Req,
  Body,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { R2Service } from 'src/r2.service';
import { imageUploadOptions } from 'src/common/upload.utils';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeLanguageDto } from './dto/change-language.dto';
import { CheckEmailDto, CheckUserFieldsDto } from './dto/check-user-fields.dto';
import { VisitDto } from './dto/visit.dto';
import { AchievementsService } from './achievements/achievements.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CheckUserFieldsResponseDto,
  EmailExistsResponseDto,
  MessageResponseDto,
  PublicUserDto,
  ToggleFollowResponseDto,
  UserProfileDto,
  UserSummaryDto,
  AchievementItemDto,
  VisitAchievementsResponseDto,
} from 'src/common/dto/swagger-response.dto';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly r2Service: R2Service,
    private readonly achievementsService: AchievementsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async updateProfile(@Req() req, @Body() dto: UpdateUserDto) {
    const userId = req.user.id;
    return await this.userService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload or replace the current user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Image file up to 5 MB',
        },
      },
    },
  })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const userId = req.user.id;
    const currentUser = await this.userService.getUserAvatar(userId);

    const avatarUrl = await this.r2Service.uploadFile(file, 'avatars');
    const updatedUser = await this.userService.updateAvatar(userId, avatarUrl);

    if (currentUser?.avatar) {
      await this.r2Service.deleteFile(currentUser.avatar);
    }

    return updatedUser;
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/:query')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Search users by username' })
  @ApiParam({ name: 'query', example: 'john' })
  @ApiOkResponse({ type: UserSummaryDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async searchUsers(@Param('query') query: string) {
    return this.userService.searchUsers(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('visit')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Record a visit and evaluate date-based achievements',
  })
  @ApiBody({ type: VisitDto })
  @ApiOkResponse({ type: VisitAchievementsResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or time zone is invalid',
  })
  visit(@Req() req, @Body() dto: VisitDto) {
    return this.achievementsService.evaluateVisit(req.user.id, dto.timeZone);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/achievements')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get achievements for a user' })
  @ApiParam({ name: 'id', example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @ApiOkResponse({ type: AchievementItemDto, isArray: true })
  @ApiUnauthorizedResponse({
    description: 'Access token is missing or invalid',
  })
  getAchievements(@Param('id') id: string) {
    return this.achievementsService.list(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a user profile by id' })
  @ApiParam({ name: 'id', example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  async getUser(@Param('id') id: string, @Req() req) {
    return this.userService.getUserById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-email')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change the current user email' })
  @ApiBody({ type: ChangeEmailDto })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed or email already exists' })
  changeEmail(@Req() req, @Body() dto: ChangeEmailDto) {
    return this.userService.changeEmail(req.user.id, dto.newEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change the current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed or old password is incorrect' })
  changePassword(
    @Req() req,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(
      req.user.id,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-language')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change the current user preferred language' })
  @ApiBody({ type: ChangeLanguageDto })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  changeLanguage(@Req() req, @Body() dto: ChangeLanguageDto) {
    return this.userService.changeLanguage(req.user.id, dto.language);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:id/follow')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Follow or unfollow a user' })
  @ApiParam({ name: 'id', example: '8f9719ff-c08f-4d3f-886a-d9be7c2ee55a' })
  @ApiOkResponse({ type: ToggleFollowResponseDto })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid' })
  toggleFollow(@Req() req, @Param('id') targetUserId: string) {
    return this.userService.toggleFollow(req.user.id, targetUserId);
  }

  @Post('/check')
  @ApiOperation({ summary: 'Check whether email or username is already taken' })
  @ApiBody({ type: CheckUserFieldsDto })
  @ApiOkResponse({ type: CheckUserFieldsResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async checkUserFields(@Body() dto: CheckUserFieldsDto) {
    return this.userService.checkUserFields(dto);
  }

  @Post('/is-email-exists')
  @ApiOperation({ summary: 'Check whether email is already taken' })
  @ApiBody({ type: CheckEmailDto })
  @ApiOkResponse({ type: EmailExistsResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async isEmailExists(@Body() dto: CheckEmailDto) {
    return this.userService.isEmailExists(dto.email);
  }
}
