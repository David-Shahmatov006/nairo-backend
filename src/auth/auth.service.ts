import { Injectable, BadRequestException } from '@nestjs/common';
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

  private generateToken(user: User) {
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

  async register(dto: RegisterDto) {
    const emailExists = await this.userRepo.findOneBy({ email: dto.email });
    const usernameExists = await this.userRepo.findOne({
      where: { username: dto.username },
    });

    if (emailExists) {
      throw new BadRequestException('Email already registered');
    }

    if (usernameExists) {
      throw new BadRequestException(
        'Username is already taken. Try something else.',
      );
    }

    const hashedPass = await bcrypt.hash(dto.password, 10);

    const newUser = this.userRepo.create({
      email: dto.email,
      password: hashedPass,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const savedUser = await this.userRepo.save(newUser);

    const token = this.generateToken(savedUser);

    return {
      message: 'User successfully created',
      user: savedUser,
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email })
      .getOne();
    
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new BadRequestException('Invalid email or password');
    }

    const token = this.generateToken(user);

    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      user: userWithoutPassword,
      token,
    };
  }
}
