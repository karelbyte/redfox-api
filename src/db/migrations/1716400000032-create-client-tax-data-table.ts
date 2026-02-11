import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateClientTaxDataTable1716400000032 implements MigrationInterface {
    name = 'CreateClientTaxDataTable1716400000032';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === 'postgres';

        await queryRunner.createTable(
            new Table({
                name: 'client_tax_data',
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
                        name: 'client_id',
                        type: isPostgres ? 'uuid' : 'varchar',
                        length: isPostgres ? undefined : '36',
                        isNullable: false,
                    },
                    {
                        name: 'tax_document',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'tax_system',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'tax_name',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'default_invoice_use',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'is_main',
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
            }),
            true,
        );

        await queryRunner.createForeignKey(
            'client_tax_data',
            new TableForeignKey({
                columnNames: ['client_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'clients',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('client_tax_data');
    }
}
