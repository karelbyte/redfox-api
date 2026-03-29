import { MigrationInterface, QueryRunner } from 'typeorm';

export class DeleteOrganizationStoredProcedure1774708587518 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      // POSTGRESQL IMPLEMENTATION (Atomic by default, but we can be explicit)
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION delete_organization_data(org_id UUID) 
        RETURNS VOID AS $$
        BEGIN
            -- En Postgres, si algo falla dentro de este bloque, 
            -- la transacción completa se revierte automáticamente.
            
            -- 1. Detalle y Tablas de Segundo Nivel
            DELETE FROM invoice_details WHERE organization_id = org_id;
            DELETE FROM invoice_payments WHERE organization_id = org_id;
            DELETE FROM account_receivable_payments WHERE organization_id = org_id;
            DELETE FROM account_payable_payments WHERE organization_id = org_id;
            DELETE FROM expense_payments WHERE organization_id = org_id;
            DELETE FROM purchase_order_details WHERE organization_id = org_id;
            DELETE FROM quotation_details WHERE organization_id = org_id;
            DELETE FROM reception_details WHERE organization_id = org_id;
            DELETE FROM return_details WHERE organization_id = org_id;
            DELETE FROM withdrawal_details WHERE organization_id = org_id;
            DELETE FROM warehouse_adjustment_details WHERE organization_id = org_id;
            DELETE FROM product_history WHERE organization_id = org_id;
            DELETE FROM audit_logs WHERE organization_id = org_id;
            DELETE FROM backup_logs WHERE organization_id = org_id;
            DELETE FROM cash_transactions WHERE organization_id = org_id;
            DELETE FROM bookmarks WHERE organization_id = org_id;
            DELETE FROM internal_notes WHERE organization_id = org_id;
            DELETE FROM notifications WHERE organization_id = org_id;
            DELETE FROM tags WHERE organization_id = org_id;
            DELETE FROM templates WHERE organization_id = org_id;
            DELETE FROM languages WHERE organization_id = org_id OR user_id IN (SELECT id FROM users WHERE organization_id = org_id);

            -- 2. Tablas Transaccionales
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
            DELETE FROM client_credits WHERE organization_id = org_id;
            DELETE FROM provider_credits WHERE organization_id = org_id;
            DELETE FROM inventory WHERE organization_id = org_id;
            DELETE FROM client_addresses WHERE organization_id = org_id;
            DELETE FROM provider_addresses WHERE organization_id = org_id;
            DELETE FROM client_tax_data WHERE organization_id = org_id;
            DELETE FROM provider_tax_data WHERE organization_id = org_id;
            DELETE FROM product_prices WHERE organization_id = org_id;
            DELETE FROM product_taxes WHERE organization_id = org_id;

            -- 3. Tablas Maestras
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
            DELETE FROM subscription_payments WHERE organization_id = org_id OR subscription_id IN (SELECT id FROM subscriptions WHERE organization_id = org_id);
            DELETE FROM subscriptions WHERE organization_id = org_id;
            DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE organization_id = org_id);
            DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE organization_id = org_id);
            DELETE FROM users WHERE organization_id = org_id;
            DELETE FROM roles WHERE organization_id = org_id;
            DELETE FROM surrogates WHERE organization_id = org_id;

            -- 4. Organización
            DELETE FROM organizations WHERE id = org_id;
        END;
        $$ LANGUAGE plpgsql;
      `);
    } else {
      // MYSQL IMPLEMENTATION (With Transactional Safety)
      await queryRunner.query('DROP PROCEDURE IF EXISTS delete_organization_data');
      await queryRunner.query(`
        CREATE PROCEDURE delete_organization_data(IN org_id CHAR(36))
        BEGIN
            -- Handler para errores: Si algo falla, hacemos ROLLBACK
            DECLARE EXIT HANDLER FOR SQLEXCEPTION
            BEGIN
                ROLLBACK;
                RESIGNAL; -- Lanza el error hacia arriba para que el API sepa que falló
            END;

            START TRANSACTION;

            -- 1. Detalle y Tablas de Segundo Nivel
            DELETE FROM invoice_details WHERE organization_id = org_id;
            DELETE FROM invoice_payments WHERE organization_id = org_id;
            DELETE FROM account_receivable_payments WHERE organization_id = org_id;
            DELETE FROM account_payable_payments WHERE organization_id = org_id;
            DELETE FROM expense_payments WHERE organization_id = org_id;
            DELETE FROM purchase_order_details WHERE organization_id = org_id;
            DELETE FROM quotation_details WHERE organization_id = org_id;
            DELETE FROM reception_details WHERE organization_id = org_id;
            DELETE FROM return_details WHERE organization_id = org_id;
            DELETE FROM withdrawal_details WHERE organization_id = org_id;
            DELETE FROM warehouse_adjustment_details WHERE organization_id = org_id;
            DELETE FROM product_history WHERE organization_id = org_id;
            DELETE FROM audit_logs WHERE organization_id = org_id;
            DELETE FROM backup_logs WHERE organization_id = org_id;
            DELETE FROM cash_transactions WHERE organization_id = org_id;
            DELETE FROM bookmarks WHERE organization_id = org_id;
            DELETE FROM internal_notes WHERE organization_id = org_id;
            DELETE FROM notifications WHERE organization_id = org_id;
            DELETE FROM tags WHERE organization_id = org_id;
            DELETE FROM templates WHERE organization_id = org_id;
            
            DELETE FROM languages WHERE organization_id = org_id OR user_id IN (SELECT id FROM (SELECT id FROM users WHERE organization_id = org_id) as u);

            -- 2. Tablas Transaccionales
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
            DELETE FROM client_credits WHERE organization_id = org_id;
            DELETE FROM provider_credits WHERE organization_id = org_id;
            DELETE FROM inventory WHERE organization_id = org_id;
            DELETE FROM client_addresses WHERE organization_id = org_id;
            DELETE FROM provider_addresses WHERE organization_id = org_id;
            DELETE FROM client_tax_data WHERE organization_id = org_id;
            DELETE FROM provider_tax_data WHERE organization_id = org_id;
            DELETE FROM product_prices WHERE organization_id = org_id;
            DELETE FROM product_taxes WHERE organization_id = org_id;

            -- 3. Tablas Maestras
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
            
            DELETE FROM subscription_payments WHERE organization_id = org_id OR subscription_id IN (SELECT id FROM (SELECT id FROM subscriptions WHERE organization_id = org_id) as s);
            DELETE FROM subscriptions WHERE organization_id = org_id;
            DELETE FROM user_roles WHERE user_id IN (SELECT id FROM (SELECT id FROM users WHERE organization_id = org_id) as u);
            DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM (SELECT id FROM roles WHERE organization_id = org_id) as r);
            DELETE FROM users WHERE organization_id = org_id;
            DELETE FROM roles WHERE organization_id = org_id;
            DELETE FROM surrogates WHERE organization_id = org_id;

            -- 4. Organización
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
  }
}
