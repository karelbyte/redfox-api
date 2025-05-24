import { MigrationInterface, QueryRunner } from 'typeorm';
import { hash } from 'bcrypt';

export class InsertDefaultUsers1716400003010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminPassword = await hash('admin123', 10);
    const sellerPassword = await hash('seller123', 10);

    // Insertar usuarios
    await queryRunner.query(`
      INSERT INTO users ( name, email, password, status, created_at)
      VALUES 
        ('Administrador', 'admin@redfox.com', '${adminPassword}', true, NOW()),
        ('Vendedor', 'vendedor@redfox.com', '${sellerPassword}', true, NOW())
    `);

    const adminRole = await queryRunner.query(`
      SELECT id FROM roles WHERE code = 'ADMIN' LIMIT 1
    `);

    const sellerRole = await queryRunner.query(`
      SELECT id FROM roles WHERE code = 'SELLER' LIMIT 1
    `);

    const adminUser = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'admin@redfox.com' LIMIT 1
    `);

    const sellerUser = await queryRunner.query(`
      SELECT id FROM users WHERE email = 'vendedor@redfox.com' LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES 
        ('${adminUser[0].id}', '${adminRole[0].id}'), -- Admin tiene rol ADMIN
        ('${sellerUser[0].id}', '${sellerRole[0].id}')  -- Vendedor tiene rol SELLER
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_roles 
      WHERE user_id <> '1'
    `);
    await queryRunner.query(`
      DELETE FROM users 
      WHERE name  IN ('Administrador', 'Vendedor')
    `);
  }
}
