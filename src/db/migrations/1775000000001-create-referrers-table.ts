import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReferrersTable1775000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'referrers',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'code', type: 'varchar', length: '20', isUnique: true },
        { name: 'name', type: 'varchar', length: '255' },
        { name: 'email', type: 'varchar', length: '255', isNullable: true },
        { name: 'phone', type: 'varchar', length: '50', isNullable: true },
        { name: 'type', type: 'enum', enum: ['internal', 'external'], default: "'external'" },
        { name: 'user_id', type: 'uuid', isNullable: true },
        { name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: '10.00' },
        { name: 'is_active', type: 'boolean', default: true },
        { name: 'notes', type: 'text', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('referrers');
  }
}
