import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateCertificationPacksTable1716400000260
  implements MigrationInterface
{
  name = 'CreateCertificationPacksTable1716400000260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      // Eliminar el tipo si existe antes de crearlo
      await queryRunner.query(`
        DROP TYPE IF EXISTS certification_pack_type_enum CASCADE;
      `);
      await queryRunner.query(`
        CREATE TYPE certification_pack_type_enum AS ENUM ('FACTURAAPI', 'FACTURA_GREEN');
      `);
    }

    await queryRunner.createTable(
      new Table({
        name: 'certification_packs',
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
            name: 'type',
            type: isPostgres ? 'certification_pack_type_enum' : 'enum',
            length: isPostgres ? undefined : undefined,
            enum: isPostgres ? undefined : ['FACTURAAPI', 'FACTURA_GREEN'],
            isNullable: false,
          },
          {
            name: 'organization_id',
            type: isPostgres ? 'uuid' : 'varchar',
            length: isPostgres ? undefined : '36',
            isNullable: false,
          },
          {
            name: 'config',
            type: isPostgres ? 'jsonb' : 'json',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
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
        foreignKeys: [
          {
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        ALTER TABLE certification_packs 
        ALTER COLUMN type TYPE varchar USING type::varchar;
        DROP TYPE IF EXISTS certification_pack_type_enum;
      `);
    }

    await queryRunner.dropTable('certification_packs');
  }
}
