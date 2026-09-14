import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmployeesTable1716400000209 implements MigrationInterface {
  name = 'CreateEmployeesTable1716400000209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'employees',
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
            name: 'employee_code',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'birth_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'gender',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'department_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'position_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'manager_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'hire_date',
            type: 'date',
          },
          {
            name: 'termination_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'salary',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'emergency_contact_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'emergency_contact_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'emergency_contact_relation',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
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
      'employees',
      new TableIndex({
        name: 'IDX_EMPLOYEES_ORGANIZATION_EMPLOYEE_CODE',
        columnNames: ['organization_id', 'employee_code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'IDX_EMPLOYEES_DEPARTMENT_ID',
        columnNames: ['department_id'],
      }),
    );

    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'IDX_EMPLOYEES_POSITION_ID',
        columnNames: ['position_id'],
      }),
    );

    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'IDX_EMPLOYEES_MANAGER_ID',
        columnNames: ['manager_id'],
      }),
    );

    await queryRunner.createIndex(
      'employees',
      new TableIndex({
        name: 'IDX_EMPLOYEES_USER_ID',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('employees');
  }
}
