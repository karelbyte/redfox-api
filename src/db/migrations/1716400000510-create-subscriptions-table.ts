import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateSubscriptionsTable1716400000510
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: isPostgres ? 'uuid_generate_v4()' : '(UUID())',
          },
          {
            name: 'organization_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'plan_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'trial_start_date',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: false,
          },
          {
            name: 'trial_end_date',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: false,
          },
          {
            name: 'subscription_start_date',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'subscription_end_date',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'stripe_subscription_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'stripe_customer_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'stripe_payment_intent_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'trial_reminder_sent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'renewal_reminder_sent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'current_period_start',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'current_period_end',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'auto_renew',
            type: 'boolean',
            default: true,
          },
          {
            name: 'canceled_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
          {
            name: 'canceled_reason',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            default: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
            onUpdate: isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: isPostgres ? 'timestamp' : 'datetime',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        columnNames: ['plan_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'plans',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('subscriptions');

    if (table) {
      const organizationForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('organization_id') !== -1,
      );
      const planForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('plan_id') !== -1,
      );

      if (organizationForeignKey) {
        await queryRunner.dropForeignKey(
          'subscriptions',
          organizationForeignKey,
        );
      }
      if (planForeignKey) {
        await queryRunner.dropForeignKey('subscriptions', planForeignKey);
      }
    }

    await queryRunner.dropTable('subscriptions');
  }
}
