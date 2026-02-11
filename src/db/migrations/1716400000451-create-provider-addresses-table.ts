import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateProviderAddressesTable1716400000451 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const isPostgres = queryRunner.connection.options.type === 'postgres';

        await queryRunner.createTable(
            new Table({
                name: 'provider_addresses',
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
                        name: 'provider_id',
                        type: isPostgres ? 'uuid' : 'varchar',
                        length: isPostgres ? undefined : '36',
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '20',
                        default: "'OTHER'",
                    },
                    {
                        name: 'street',
                        type: 'varchar',
                        length: '200',
                        isNullable: true,
                    },
                    {
                        name: 'exterior_number',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'interior_number',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'neighborhood',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'city',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'municipality',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'zip_code',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'state',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'country',
                        type: 'varchar',
                        length: '3',
                        default: "'MEX'",
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
            'provider_addresses',
            new TableForeignKey({
                columnNames: ['provider_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'providers',
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('provider_addresses');
    }
}
