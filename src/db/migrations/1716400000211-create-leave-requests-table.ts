import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLeaveRequestsTable1716400000211 implements MigrationInterface {
  name = 'CreateLeaveRequestsTable1716400000211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'leave_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
          },
          {
            name: 'employee_id',
            type: 'uuid',
          },
          {
            name: 'leave_type',
            type: 'enum',
            enum: ['vacation', 'sick', 'personal', 'maternity', 'paternity'],
          },
          {
            name: 'start_date',
            type: 'date',
          },
          {
            name: 'end_date',
            type: 'date',
          },
          {
            name: 'days_count',
            type: 'integer',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'approved_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'leave_requests',
      new TableIndex({
        name: 'IDX_LEAVE_REQUESTS_ORGANIZATION_EMPLOYEE_ID',
        columnNames: ['organization_id', 'employee_id'],
      }),
    );

    await queryRunner.createIndex(
      'leave_requests',
      new TableIndex({
        name: 'IDX_LEAVE_REQUESTS_STATUS',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('leave_requests');
  }
}
