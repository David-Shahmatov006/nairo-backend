import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    this.client = redisUrl
      ? createClient({ url: redisUrl })
      : createClient({
        socket: {
          host: this.configService.get<string>('REDIS_HOST', '127.0.0.1'),
          port: Number(this.configService.get<string>('REDIS_PORT', '6379')),
        },
      });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  async onModuleInit() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.client.set(key, value, { EX: ttlSeconds });
  }

  async setJson(key: string, value: unknown, ttlSeconds: number) {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async consumeIfMatches(key: string, expectedValue: string) {
    const result = await this.client.eval(
      `
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          return redis.call('DEL', KEYS[1])
        end
        return 0
      `,
      {
        keys: [key],
        arguments: [expectedValue],
      },
    );

    return result === 1;
  }

  async del(...keys: string[]) {
    if (keys.length) {
      await this.client.del(keys);
    }
  }
}
