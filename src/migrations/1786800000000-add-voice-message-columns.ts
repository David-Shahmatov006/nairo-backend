import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVoiceMessageColumns1786800000000 implements MigrationInterface {
  name = 'AddVoiceMessageColumns1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message" ADD "type" character varying(16) NOT NULL DEFAULT 'text'`,
    );
    await queryRunner.query(`ALTER TABLE "message" ADD "audioUrl" text`);
    await queryRunner.query(`ALTER TABLE "message" ADD "durationMs" integer`);
    await queryRunner.query(`ALTER TABLE "message" ADD "waveform" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "message" ALTER COLUMN "text" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "message" SET "text" = '' WHERE "text" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "message" ALTER COLUMN "text" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "waveform"`);
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "durationMs"`);
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "audioUrl"`);
    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "type"`);
  }
}
