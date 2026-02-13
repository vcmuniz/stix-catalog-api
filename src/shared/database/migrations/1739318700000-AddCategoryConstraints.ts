import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryConstraints1739318700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Uma categoria não pode ser pai de si mesma
    await queryRunner.query(`
      ALTER TABLE categories
      ADD CONSTRAINT chk_category_not_self_parent
      CHECK (id != "parentId" OR "parentId" IS NULL)
    `);

    // Indice para melhorar performance em queries de parent
    await queryRunner.query(`
      CREATE INDEX idx_categories_parentId ON categories("parentId")
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover CHECK constraint
    await queryRunner.query(`
      ALTER TABLE categories
      DROP CONSTRAINT chk_category_not_self_parent
    `);

    // Remover índices
    await queryRunner.query(`
      DROP INDEX idx_categories_parentId
    `);
  }
}
