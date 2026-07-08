import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveJoinTableFromPostsSavings1783521707692 implements MigrationInterface {
    name = 'RemoveJoinTableFromPostsSavings1783521707692'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_saved_posts_post" DROP CONSTRAINT "FK_c2c01ef0ee9b2f83b9583efc5b2"`);
        await queryRunner.query(`ALTER TABLE "user_saved_posts_post" ADD CONSTRAINT "FK_c2c01ef0ee9b2f83b9583efc5b2" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_saved_posts_post" DROP CONSTRAINT "FK_c2c01ef0ee9b2f83b9583efc5b2"`);
        await queryRunner.query(`ALTER TABLE "user_saved_posts_post" ADD CONSTRAINT "FK_c2c01ef0ee9b2f83b9583efc5b2" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
