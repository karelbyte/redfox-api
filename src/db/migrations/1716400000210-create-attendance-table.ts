import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAttendanceTable1716400000210 implements MigrationInterface {
  name = 'CreateAttendanceTable1716400000210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'attendance',
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
            name: 'check_in',
            type: 'timestamp',
          },
          {
            name: 'check_out',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'work_hours',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'overtime_hours',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'present'",
          },
          {
            name: 'notes',
            type: 'text',
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
      'attendance',
      new TableIndex({
        name: 'IDX_ATTENDANCE_ORGANIZATION_EMPLOYEE_ID',
        columnNames: ['organization_id', 'employee_id'],
      }),
    );

    await queryRunner.createIndex(
      'attendance',
      new TableIndex({
        name: 'IDX_ATTENDANCE_DATE',
        columnNames: ['date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('attendance');
  }
}
