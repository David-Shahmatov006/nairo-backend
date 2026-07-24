import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEditedAtColumnToMessage1784732150263 implements MigrationInterface {
    name = 'AddEditedAtColumnToMessage1784732150263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" ADD "editedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP COLUMN "editedAt"`);
    }

}
