import { Injectable, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/user/entities/user.entity';
import { Interest } from 'src/interests/entities/interest.entity';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Interest)
    private interestRepo: Repository<Interest>,
    private jwtService: JwtService,
  ) {}

  private generateToken(user: User) {
    return this.jwtService.sign({ id: user.id, email: user.email });
  }

  async register(dto: RegisterDto) {
    const userExists = await this.userRepo.findOneBy({ email: dto.email });
    const usernameExists = await this.userRepo.findOne({
      where: { username: dto.username },
    });

    if (userExists) {
      throw new BadRequestException('Email already registered');
    }

    if (usernameExists) {
      throw new BadRequestException(
        'Username is already taken. Try something else.',
      );
    }

    const hashedPass = await bcrypt.hash(dto.password, 10);

    // interests
    const interests: Interest[] = [];
    for (const name of dto.interests) {
      let interest = await this.interestRepo.findOneBy({ name });
      if (!interest) {
        interest = this.interestRepo.create({ name });
        await this.interestRepo.save(interest);
      }
      interests.push(interest);
    }

    const newUser = this.userRepo.create({
      email: dto.email,
      password: hashedPass,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      interests,
    });

    const savedUser = await this.userRepo.save(newUser);

    const token = this.generateToken(savedUser);

    return {
      message: 'User created',
      user: savedUser,
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['interests'],
    });

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid email or password');
    }

    const token = this.generateToken(user);

    return {
      message: 'Login successful',
      user,
      token,
    };
  }
}
