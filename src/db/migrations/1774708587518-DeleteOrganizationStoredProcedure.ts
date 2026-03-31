import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class DeleteOrganizationStoredProcedure1774708587518 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    // 1. Agregar columna organization_id a las tablas que faltaban originalmente
    const tablesToFix = [
      'languages',
      'backup_configs',
      'backup_logs',
      'bookmarks',
      'internal_notes',
      'tags',
      'templates'
    ];

    for (const tableName of tablesToFix) {
      const table = await queryRunner.getTable(tableName);
      if (table && !table.findColumnByName('organization_id')) {
        await queryRunner.addColumn(
          tableName,
          new TableColumn({
            name: 'organization_id',
            type: isPostgres ? 'uuid' : 'varchar(36)',
            isNullable: true,
          })
        );

        await queryRunner.createIndex(
          tableName,
          new TableIndex({
            name: `IDX_${tableName}_organization_id`,
            columnNames: ['organization_id'],
          })
        );
      }
    }

    // 2. Crear o Reemplazar el Stored Procedure con la lógica definitiva
    if (isPostgres) {
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION delete_organization_data(org_id UUID) 
        RETURNS VOID AS $$
        BEGIN
            -- 1. Detalle y Tablas de Tercer Nivel (Con nombres corregidos y comillas para camelCase)
            DELETE FROM invoice_details WHERE invoice_id IN (SELECT id FROM invoices WHERE organization_id = org_id);
            DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE organization_id = org_id);
            DELETE FROM account_receivable_payments WHERE "accountReceivableId" IN (SELECT id FROM accounts_receivable WHERE organization_id = org_id);
            DELETE FROM account_payable_payments WHERE "accountPayableId" IN (SELECT id FROM accounts_payable WHERE organization_id = org_id);
            DELETE FROM expense_payments WHERE "expenseId" IN (SELECT id FROM expenses WHERE organization_id = org_id);
            DELETE FROM purchase_order_details WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE organization_id = org_id);
            DELETE FROM quotation_details WHERE quotation_id IN (SELECT id FROM quotations WHERE organization_id = org_id);
            DELETE FROM reception_details WHERE reception_id IN (SELECT id FROM receptions WHERE organization_id = org_id);
            DELETE FROM return_details WHERE return_id IN (SELECT id FROM returns WHERE organization_id = org_id);
            DELETE FROM withdrawal_details WHERE withdrawal_id IN (SELECT id FROM withdrawals WHERE organization_id = org_id);
            DELETE FROM warehouse_adjustment_details WHERE warehouse_adjustment_id IN (SELECT id FROM warehouse_adjustments WHERE organization_id = org_id);
            DELETE FROM cash_transactions WHERE cash_register_id IN (SELECT id FROM cash_registers WHERE organization_id = org_id);
            DELETE FROM client_addresses WHERE client_id IN (SELECT id FROM clients WHERE organization_id = org_id);
            DELETE FROM client_credits WHERE client_id IN (SELECT id FROM clients WHERE organization_id = org_id);
            DELETE FROM client_tax_data WHERE client_id IN (SELECT id FROM clients WHERE organization_id = org_id);
            DELETE FROM provider_addresses WHERE provider_id IN (SELECT id FROM providers WHERE organization_id = org_id);
            DELETE FROM provider_credits WHERE provider_id IN (SELECT id FROM providers WHERE organization_id = org_id);
            DELETE FROM provider_tax_data WHERE provider_id IN (SELECT id FROM providers WHERE organization_id = org_id);
            DELETE FROM product_prices WHERE product_id IN (SELECT id FROM products WHERE organization_id = org_id);
            DELETE FROM product_taxes WHERE product_id IN (SELECT id FROM products WHERE organization_id = org_id);
            DELETE FROM product_history WHERE product_id IN (SELECT id FROM products WHERE organization_id = org_id);
            DELETE FROM subscription_payments WHERE subscription_id IN (SELECT id FROM subscriptions WHERE organization_id = org_id);

            -- 2. Con organization_id directo
            DELETE FROM audit_logs WHERE organization_id = org_id;
            DELETE FROM backup_logs WHERE organization_id = org_id;
            DELETE FROM bookmarks WHERE organization_id = org_id;
            DELETE FROM internal_notes WHERE organization_id = org_id;
            DELETE FROM notifications WHERE organization_id = org_id;
            DELETE FROM tags WHERE organization_id = org_id;
            DELETE FROM templates WHERE organization_id = org_id;
            DELETE FROM languages WHERE organization_id = org_id OR user_id IN (SELECT id FROM users WHERE organization_id = org_id);

            -- 3. Tablas Transaccionales
            DELETE FROM invoices WHERE organization_id = org_id;
            DELETE FROM withdrawals WHERE organization_id = org_id;
            DELETE FROM accounts_receivable WHERE organization_id = org_id;
            DELETE FROM accounts_payable WHERE organization_id = org_id;
            DELETE FROM purchase_orders WHERE organization_id = org_id;
            DELETE FROM quotations WHERE organization_id = org_id;
            DELETE FROM receptions WHERE organization_id = org_id;
            DELETE FROM returns WHERE organization_id = org_id;
            DELETE FROM warehouse_adjustments WHERE organization_id = org_id;
            DELETE FROM warehouse_openings WHERE organization_id = org_id;
            DELETE FROM expenses WHERE organization_id = org_id;
            DELETE FROM cash_registers WHERE organization_id = org_id;
            DELETE FROM inventory WHERE organization_id = org_id;

            -- 4. Tablas Maestras
            DELETE FROM products WHERE organization_id = org_id;
            DELETE FROM clients WHERE organization_id = org_id;
            DELETE FROM providers WHERE organization_id = org_id;
            DELETE FROM warehouses WHERE organization_id = org_id;
            DELETE FROM categories WHERE organization_id = org_id;
            DELETE FROM brands WHERE organization_id = org_id;
            DELETE FROM expense_categories WHERE organization_id = org_id;
            DELETE FROM measurement_units WHERE organization_id = org_id;
            DELETE FROM currencies WHERE organization_id = org_id;
            DELETE FROM taxes WHERE organization_id = org_id;
            DELETE FROM company_settings WHERE organization_id = org_id;
            DELETE FROM email_configs WHERE organization_id = org_id;
            DELETE FROM backup_configs WHERE organization_id = org_id;
            DELETE FROM certification_packs WHERE organization_id = org_id;
            DELETE FROM subscriptions WHERE organization_id = org_id;
            DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE organization_id = org_id);
            DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE organization_id = org_id);
            DELETE FROM users WHERE organization_id = org_id;
            DELETE FROM roles WHERE organization_id = org_id;
            DELETE FROM surrogates WHERE organization_id = org_id;

            -- 5. Organización Final
            DELETE FROM organizations WHERE id = org_id;
        END;
        $$ LANGUAGE plpgsql;
      `);
    } else {
      // Procedimiento para MySQL (Versión consolidada)
      await queryRunner.query('DROP PROCEDURE IF EXISTS delete_organization_data');
      await queryRunner.query(`
        CREATE PROCEDURE delete_organization_data(IN org_id CHAR(36))
        BEGIN
            DECLARE EXIT HANDLER FOR SQLEXCEPTION
            BEGIN
                ROLLBACK;
                RESIGNAL;
            END;

            START TRANSACTION;

            -- 1. Detalle y Tablas de Tercer Nivel
            DELETE FROM invoice_details WHERE invoice_id IN (SELECT id FROM invoices WHERE organization_id = org_id);
            DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE organization_id = org_id);
            DELETE FROM account_receivable_payments WHERE accountReceivableId IN (SELECT id FROM (SELECT id FROM accounts_receivable WHERE organization_id = org_id) as t);
            DELETE FROM account_payable_payments WHERE accountPayableId IN (SELECT id FROM (SELECT id FROM accounts_payable WHERE organization_id = org_id) as t);
            DELETE FROM expense_payments WHERE expenseId IN (SELECT id FROM (SELECT id FROM expenses WHERE organization_id = org_id) as t);
            DELETE FROM purchase_order_details WHERE purchase_order_id IN (SELECT id FROM (SELECT id FROM purchase_orders WHERE organization_id = org_id) as t);
            DELETE FROM quotation_details WHERE quotation_id IN (SELECT id FROM (SELECT id FROM quotations WHERE organization_id = org_id) as t);
            DELETE FROM reception_details WHERE reception_id IN (SELECT id FROM (SELECT id FROM receptions WHERE organization_id = org_id) as t);
            DELETE FROM return_details WHERE return_id IN (SELECT id FROM (SELECT id FROM returns WHERE organization_id = org_id) as t);
            DELETE FROM withdrawal_details WHERE withdrawal_id IN (SELECT id FROM (SELECT id FROM withdrawals WHERE organization_id = org_id) as t);
            DELETE FROM warehouse_adjustment_details WHERE warehouse_adjustment_id IN (SELECT id FROM (SELECT id FROM warehouse_adjustments WHERE organization_id = org_id) as t);
            DELETE FROM cash_transactions WHERE cash_register_id IN (SELECT id FROM (SELECT id FROM cash_registers WHERE organization_id = org_id) as t);
            DELETE FROM client_addresses WHERE client_id IN (SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) as t);
            DELETE FROM client_credits WHERE client_id IN (SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) as t);
            DELETE FROM client_tax_data WHERE client_id IN (SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) as t);
            DELETE FROM provider_addresses WHERE provider_id IN (SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) as t);
            DELETE FROM provider_credits WHERE provider_id IN (SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) as t);
            DELETE FROM provider_tax_data WHERE provider_id IN (SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) as t);
            DELETE FROM product_prices WHERE product_id IN (SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) as t);
            DELETE FROM product_taxes WHERE product_id IN (SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) as t);
            DELETE FROM product_history WHERE product_id IN (SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) as t);
            DELETE FROM subscription_payments WHERE subscription_id IN (SELECT id FROM (SELECT id FROM subscriptions WHERE organization_id = org_id) as t);

            -- 2. Con organization_id
            DELETE FROM audit_logs WHERE organization_id = org_id;
            DELETE FROM backup_logs WHERE organization_id = org_id;
            DELETE FROM bookmarks WHERE organization_id = org_id;
            DELETE FROM internal_notes WHERE organization_id = org_id;
            DELETE FROM notifications WHERE organization_id = org_id;
            DELETE FROM tags WHERE organization_id = org_id;
            DELETE FROM templates WHERE organization_id = org_id;
            DELETE FROM languages WHERE organization_id = org_id OR user_id IN (SELECT id FROM (SELECT id FROM users WHERE organization_id = org_id) as u);

            -- 3. Transaccionales
            DELETE FROM invoices WHERE organization_id = org_id;
            DELETE FROM withdrawals WHERE organization_id = org_id;
            DELETE FROM accounts_receivable WHERE organization_id = org_id;
            DELETE FROM accounts_payable WHERE organization_id = org_id;
            DELETE FROM purchase_orders WHERE organization_id = org_id;
            DELETE FROM quotations WHERE organization_id = org_id;
            DELETE FROM receptions WHERE organization_id = org_id;
            DELETE FROM returns WHERE organization_id = org_id;
            DELETE FROM warehouse_adjustments WHERE organization_id = org_id;
            DELETE FROM warehouse_openings WHERE organization_id = org_id;
            DELETE FROM expenses WHERE organization_id = org_id;
            DELETE FROM cash_registers WHERE organization_id = org_id;
            DELETE FROM inventory WHERE organization_id = org_id;

            -- 4. Maestras
            DELETE FROM products WHERE organization_id = org_id;
            DELETE FROM clients WHERE organization_id = org_id;
            DELETE FROM providers WHERE organization_id = org_id;
            DELETE FROM warehouses WHERE organization_id = org_id;
            DELETE FROM categories WHERE organization_id = org_id;
            DELETE FROM brands WHERE organization_id = org_id;
            DELETE FROM expense_categories WHERE organization_id = org_id;
            DELETE FROM measurement_units WHERE organization_id = org_id;
            DELETE FROM currencies WHERE organization_id = org_id;
            DELETE FROM taxes WHERE organization_id = org_id;
            DELETE FROM company_settings WHERE organization_id = org_id;
            DELETE FROM email_configs WHERE organization_id = org_id;
            DELETE FROM backup_configs WHERE organization_id = org_id;
            DELETE FROM certification_packs WHERE organization_id = org_id;
            DELETE FROM subscriptions WHERE organization_id = org_id;
            DELETE FROM user_roles WHERE user_id IN (SELECT id FROM (SELECT id FROM users WHERE organization_id = org_id) as u);
            DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM (SELECT id FROM roles WHERE organization_id = org_id) as r);
            DELETE FROM users WHERE organization_id = org_id;
            DELETE FROM roles WHERE organization_id = org_id;
            DELETE FROM surrogates WHERE organization_id = org_id;

            -- 5. Organización Final
            DELETE FROM organizations WHERE id = org_id;

            COMMIT;
        END;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    if (isPostgres) {
      await queryRunner.query('DROP FUNCTION IF EXISTS delete_organization_data(UUID)');
    } else {
      await queryRunner.query('DROP PROCEDURE IF EXISTS delete_organization_data');
    }

    // Revertir columnas si se desea (opcional)
  }
}
