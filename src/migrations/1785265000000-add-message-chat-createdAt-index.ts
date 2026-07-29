import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageChatCreatedAtIndex1785265000000
  implements MigrationInterface
{
  name = 'AddMessageChatCreatedAtIndex1785265000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_message_chatId_createdAt" ON "message" ("chatId", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_message_chatId_senderId_createdAt" ON "message" ("chatId", "senderId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_message_chatId_senderId_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_message_chatId_createdAt"`,
    );
  }
}
