import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSavedByFieldToPostEntity1783431903490 implements MigrationInterface {
    name = 'AddSavedByFieldToPostEntity1783431903490'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "post_saved_by_user" ("postId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_83da4d6311214b9a606ce87b72e" PRIMARY KEY ("postId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3084f8f2dcc1fbb4aeb59a4e06" ON "post_saved_by_user" ("postId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e7064ea914250570a26b85b2d0" ON "post_saved_by_user" ("userId") `);
        await queryRunner.query(`ALTER TABLE "post_saved_by_user" ADD CONSTRAINT "FK_3084f8f2dcc1fbb4aeb59a4e061" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "post_saved_by_user" ADD CONSTRAINT "FK_e7064ea914250570a26b85b2d0b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_saved_by_user" DROP CONSTRAINT "FK_e7064ea914250570a26b85b2d0b"`);
        await queryRunner.query(`ALTER TABLE "post_saved_by_user" DROP CONSTRAINT "FK_3084f8f2dcc1fbb4aeb59a4e061"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e7064ea914250570a26b85b2d0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3084f8f2dcc1fbb4aeb59a4e06"`);
        await queryRunner.query(`DROP TABLE "post_saved_by_user"`);
    }

}
