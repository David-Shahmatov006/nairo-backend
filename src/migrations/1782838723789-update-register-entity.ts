import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRegisterEntity1782838723789 implements MigrationInterface {
    name = 'UpdateRegisterEntity1782838723789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_adc492faf309ebf60ca6425e183"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "nairoBalance"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isPremium"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_bf0e513b5cd8b4e937fa0702311"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "referralCode"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "inviteRewards"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "referredById"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "referredById" uuid`);
        await queryRunner.query(`ALTER TABLE "user" ADD "inviteRewards" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user" ADD "referralCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_bf0e513b5cd8b4e937fa0702311" UNIQUE ("referralCode")`);
        await queryRunner.query(`ALTER TABLE "user" ADD "isPremium" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user" ADD "nairoBalance" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_adc492faf309ebf60ca6425e183" FOREIGN KEY ("referredById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
