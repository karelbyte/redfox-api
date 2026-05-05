import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEmployeeDocumentsTable1716400000213 implements MigrationInterface {
  name = 'CreateEmployeeDocumentsTable1716400000213';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'employee_documents',
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
            name: 'document_type',
            type: 'enum',
            enum: ['contract', 'id_card', 'passport', 'resume', 'certificate', 'medical', 'police_record'],
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'issue_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'expiry_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
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
      'employee_documents',
      new TableIndex({
        name: 'IDX_EMPLOYEE_DOCUMENTS_ORGANIZATION_EMPLOYEE_ID',
        columnNames: ['organization_id', 'employee_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('employee_documents');
  }
}
