import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ACHIEVEMENT_KEYS, AchievementKey } from './achievement-keys';
import { getZonedDateParts, isValidTimeZone } from './get-zoned-date-parts';
import { HOLIDAY_RULES } from './rules';
import { shouldUnlockVeteran } from './rules/veteran';
import { isNightOwlHour } from './rules/night-owl';

export type AchievementListItem = {
  key: AchievementKey;
  unlocked: boolean;
};

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async grant(userId: string, key: AchievementKey): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const unlocked = user.unlockedAchievements ?? [];

    if (unlocked.includes(key)) {
      return false;
    }

    user.unlockedAchievements = [...unlocked, key];
    await this.userRepo.save(user);

    return true;
  }

  async list(userId: string): Promise<AchievementListItem[]> {
    return this.toList(userId);
  }

  async evaluateVisit(
    userId: string,
    timeZone: string,
  ): Promise<{
    achievements: AchievementListItem[];
    newlyUnlocked: AchievementKey[];
  }> {
    this.assertValidTimeZone(timeZone);

    const newlyUnlocked: AchievementKey[] = [];
    const parts = getZonedDateParts(new Date(), timeZone);

    for (const rule of HOLIDAY_RULES) {
      if (parts.month === rule.month && parts.day === rule.day) {
        const granted = await this.grant(userId, rule.key);
        if (granted) {
          newlyUnlocked.push(rule.key);
        }
      }
    }

    const veteranGranted = await this.evaluateVeteran(userId);
    if (veteranGranted) {
      newlyUnlocked.push('veteran');
    }

    return {
      achievements: await this.toList(userId),
      newlyUnlocked,
    };
  }

  async evaluateNightOwl(
    userId: string,
    createdAt: Date,
    timeZone?: string,
  ): Promise<boolean> {
    if (!timeZone || !isValidTimeZone(timeZone)) {
      return false;
    }

    const { hour } = getZonedDateParts(createdAt, timeZone);

    if (isNightOwlHour(hour)) {
      return this.grant(userId, 'night_owl');
    }

    return false;
  }

  async evaluateEarlyBird(userId: string): Promise<boolean> {
    const count = await this.userRepo.count();

    if (count <= 100) {
      return this.grant(userId, 'early_bird');
    }

    return false;
  }

  async evaluatePolyglot(
    userId: string,
    previousLanguage: string,
    nextLanguage: string,
  ): Promise<boolean> {
    if (previousLanguage !== nextLanguage) {
      return this.grant(userId, 'polyglot');
    }

    return false;
  }

  private async evaluateVeteran(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'createdAt'],
    });

    if (!user?.createdAt) {
      return false;
    }

    if (shouldUnlockVeteran(user.createdAt)) {
      return this.grant(userId, 'veteran');
    }

    return false;
  }

  private async toList(userId: string): Promise<AchievementListItem[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const unlocked = new Set(user.unlockedAchievements ?? []);

    if (user.createdAt && shouldUnlockVeteran(user.createdAt)) {
      unlocked.add('veteran');
    }

    return ACHIEVEMENT_KEYS.map((key) => ({
      key,
      unlocked: unlocked.has(key),
    }));
  }

  private assertValidTimeZone(timeZone: string): void {
    if (!isValidTimeZone(timeZone)) {
      throw new BadRequestException('Invalid time zone');
    }
  }
}
