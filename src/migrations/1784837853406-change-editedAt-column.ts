import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeEditedAtColumn1784837853406 implements MigrationInterface {
    name = 'ChangeEditedAtColumn1784837853406'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" ALTER COLUMN "editedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message" ALTER COLUMN "editedAt" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" ALTER COLUMN "editedAt" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "message" ALTER COLUMN "editedAt" SET NOT NULL`);
    }

}
