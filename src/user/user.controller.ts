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

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly r2Service: R2Service,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch('update')
  async updateProfile(@Req() req, @Body() dto: UpdateUserDto) {
    const userId = req.user.id;
    return await this.userService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const userId = req.user.id;
    const currentUser = await this.userService.getUserById(userId, userId);

    const avatarUrl = await this.r2Service.uploadFile(file, 'avatars');
    const updatedUser = await this.userService.updateAvatar(userId, avatarUrl);

    if (currentUser && currentUser.avatar) {
      await this.r2Service.deleteFile(currentUser.avatar);
    }

    return updatedUser;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:id')
  async getUser(@Param('id') id: string, @Req() req) {
    return this.userService.getUserById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-email')
  changeEmail(@Req() req, @Body() body: { newEmail: string }) {
    return this.userService.changeEmail(req.user.id, body.newEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  changePassword(
    @Req() req,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(
      req.user.id,
      body.oldPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-language')
  changeLanguage(@Req() req, @Body() body: { language: string }) {
    return this.userService.changeLanguage(req.user.id, body.language);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:id/follow')
  toggleFollow(@Req() req, @Param('id') targetUserId: string) {
    return this.userService.toggleFollow(req.user.id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search/:query')
  async searchUsers(@Param('query') query: string) {
    return this.userService.searchUsers(query);
  }

  @Post('/check')
  async checkUserFields(@Body() dto: { email: string; username: string }) {
    return this.userService.checkUserFields(dto);
  }
}
