import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeToMessageSender1783161204409 implements MigrationInterface {
    name = 'AddCascadeToMessageSender1783161204409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_bc096b4e18b1f9508197cd98066"`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_bc096b4e18b1f9508197cd98066"`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
