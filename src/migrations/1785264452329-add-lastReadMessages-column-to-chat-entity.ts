import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastReadMessagesColumnToChatEntity1785264452329 implements MigrationInterface {
    name = 'AddLastReadMessagesColumnToChatEntity1785264452329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat" ADD "lastReadMessages" json DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "lastReadMessages"`);
    }

}
