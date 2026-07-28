import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeJsonToJsonb1785264679838 implements MigrationInterface {
    name = 'ChangeJsonToJsonb1785264679838'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "lastReadMessages"`);
        await queryRunner.query(`ALTER TABLE "chat" ADD "lastReadMessages" jsonb DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "lastReadMessages"`);
        await queryRunner.query(`ALTER TABLE "chat" ADD "lastReadMessages" json DEFAULT '{}'`);
    }

}
