import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestampz1783336176009 implements MigrationInterface {
    name = 'AddTimestampz1783336176009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password_resets" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "password_resets" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "comment" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "comment" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "password_resets" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "password_resets" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
