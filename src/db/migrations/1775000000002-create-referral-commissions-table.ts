import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReferralCommissionsTable1775000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'referral_commissions',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'referrer_id', type: 'uuid' },
        { name: 'organization_id', type: 'uuid' },
        { name: 'subscription_payment_id', type: 'uuid', isNullable: true },
        { name: 'plan_name', type: 'varchar', length: '255', isNullable: true },
        { name: 'plan_price', type: 'decimal', precision: 10, scale: 2, default: '0' },
        { name: 'commission_rate', type: 'decimal', precision: 5, scale: 2 },
        { name: 'commission_amount', type: 'decimal', precision: 10, scale: 2 },
        { name: 'status', type: 'enum', enum: ['pending', 'approved', 'paid'], default: "'pending'" },
        { name: 'paid_at', type: 'timestamp', isNullable: true },
        { name: 'payment_notes', type: 'text', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
      foreignKeys: [
        { columnNames: ['referrer_id'], referencedColumnNames: ['id'], referencedTableName: 'referrers', onDelete: 'RESTRICT' },
        { columnNames: ['organization_id'], referencedColumnNames: ['id'], referencedTableName: 'organizations', onDelete: 'CASCADE' },
      ],
    }), true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('referral_commissions');
  }
}
