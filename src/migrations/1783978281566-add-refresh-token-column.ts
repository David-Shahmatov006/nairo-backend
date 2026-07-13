import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenColumn1783978281566 implements MigrationInterface {
    name = 'AddRefreshTokenColumn1783978281566'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_liked_posts_post" ("userId" uuid NOT NULL, "postId" uuid NOT NULL, CONSTRAINT "PK_d4060b23ca4161e5626b703e8fe" PRIMARY KEY ("userId", "postId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6199124c646dd9a89215eaa80d" ON "user_liked_posts_post" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2fa174d02cadc279ba767cf199" ON "user_liked_posts_post" ("postId") `);
        await queryRunner.query(`ALTER TABLE "user" ADD "refreshToken" character varying`);
        await queryRunner.query(`ALTER TABLE "user_liked_posts_post" ADD CONSTRAINT "FK_6199124c646dd9a89215eaa80d4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_liked_posts_post" ADD CONSTRAINT "FK_2fa174d02cadc279ba767cf199e" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_liked_posts_post" DROP CONSTRAINT "FK_2fa174d02cadc279ba767cf199e"`);
        await queryRunner.query(`ALTER TABLE "user_liked_posts_post" DROP CONSTRAINT "FK_6199124c646dd9a89215eaa80d4"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "refreshToken"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2fa174d02cadc279ba767cf199"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6199124c646dd9a89215eaa80d"`);
        await queryRunner.query(`DROP TABLE "user_liked_posts_post"`);
    }

}
