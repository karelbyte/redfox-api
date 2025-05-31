import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertDefaultRoles1716400003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO roles ( code, description, status, created_at)
      VALUES 
        ('ADMIN', 'Administrador del sistema', true, NOW()),
        ('SELLER', 'Vendedor', true, NOW())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM roles 
      WHERE code IN ('ADMIN', 'SELLER')
    `);
  }
}
