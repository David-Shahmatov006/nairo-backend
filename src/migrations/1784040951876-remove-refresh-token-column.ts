import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveRefreshTokenColumn1784040951876 implements MigrationInterface {
    name = 'RemoveRefreshTokenColumn1784040951876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "refreshToken"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "refreshToken" character varying`);
    }

}
