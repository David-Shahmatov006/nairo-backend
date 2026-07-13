import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private generateAccessToken(user: User) {
    return this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '1d',
      },
    );
  }

  private generateRefreshToken(user: User) {
    return this.jwtService.sign(
      {
        id: user.id,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      },
    );
  }

  async register(dto: RegisterDto) {
    const emailExists = await this.userRepo.findOneBy({
      email: dto.email,
    });

    if (emailExists) {
      throw new BadRequestException('Email already registered');
    }

    const usernameExists = await this.userRepo.findOne({
      where: {
        username: dto.username,
      },
    });

    if (usernameExists) {
      throw new BadRequestException(
        'Username is already taken. Try something else.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      preferredLanguage: dto.language,
    });

    const savedUser = await this.userRepo.save(user);

    const accessToken = this.generateAccessToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser);

    const { password, ...userWithoutPassword } = savedUser;

    return {
      message: 'User successfully created',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: dto.email,
      })
      .getOne();

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new BadRequestException('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.userRepo.findOne({
        where: {
          id: payload.id,
        },
      });

      if (!user) {
        throw new UnauthorizedException();
      }

      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
