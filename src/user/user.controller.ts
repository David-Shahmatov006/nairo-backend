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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Post('update')
  async updateProfile(@Req() req, @Body() dto: UpdateUserDto) {
    const userId = req.user.id;
    return await this.userService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, unique + extname(file.originalname));
        },
      }),
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const userId = req.user.id;

    const avatarUrl = '/uploads/avatars/' + file.filename;

    return await this.userService.updateAvatar(userId, avatarUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
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
}
