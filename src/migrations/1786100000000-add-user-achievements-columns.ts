import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAchievementsColumns1786100000000 implements MigrationInterface {
  name = 'AddUserAchievementsColumns1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "unlockedAchievements" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(`
      UPDATE "user"
      SET "unlockedAchievements" = "unlockedAchievements" || '["early_bird"]'::jsonb
      WHERE (SELECT COUNT(*) FROM "user") <= 100
        AND NOT ("unlockedAchievements" @> '["early_bird"]'::jsonb)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "unlockedAchievements"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "createdAt"`);
  }
}
