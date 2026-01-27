import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateClientsTable1716400000030 implements MigrationInterface {
  name = 'CreateClientsTable1716400000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    await queryRunner.createTable(
      new Table({
        name: 'clients',
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
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'tax_document',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'address_street',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'address_exterior',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address_interior',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'address_neighborhood',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address_city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address_municipality',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address_zip',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'address_state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'address_country',
            type: 'varchar',
            length: '3',
            isNullable: true,
            default: "'MEX'",
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'tax_system',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'default_invoice_use',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'boolean',
            default: true,
          },
          {
            name: 'pack_product_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'pack_product_response',
            type: isPostgres ? 'jsonb' : 'text',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clients');
  }
}
