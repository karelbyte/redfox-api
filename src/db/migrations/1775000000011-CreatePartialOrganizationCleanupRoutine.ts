import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePartialOrganizationCleanupRoutine1775000000011
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION partial_cleanup_organization_data(
          org_id UUID,
          clean_products BOOLEAN,
          clean_clients BOOLEAN,
          clean_providers BOOLEAN,
          clean_quotations BOOLEAN,
          clean_receptions BOOLEAN,
          clean_inventory_stock BOOLEAN,
          clean_sales BOOLEAN,
          clean_invoices BOOLEAN
        )
        RETURNS VOID AS $$
        BEGIN
            IF clean_quotations THEN
                DELETE FROM quotation_details
                WHERE quotation_id IN (
                    SELECT id FROM quotations WHERE organization_id = org_id
                );

                DELETE FROM quotations WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('quotation');
            END IF;

            IF clean_invoices THEN
                UPDATE withdrawals
                SET invoice_id = NULL
                WHERE organization_id = org_id
                  AND invoice_id IN (
                    SELECT id FROM invoices WHERE organization_id = org_id
                  );

                DELETE FROM account_receivable_payments
                WHERE "accountReceivableId" IN (
                    SELECT id
                    FROM accounts_receivable
                    WHERE organization_id = org_id
                      AND "invoiceId" IN (
                        SELECT id FROM invoices WHERE organization_id = org_id
                      )
                );

                DELETE FROM accounts_receivable
                WHERE organization_id = org_id
                  AND "invoiceId" IN (
                    SELECT id FROM invoices WHERE organization_id = org_id
                  );

                DELETE FROM invoice_payments
                WHERE invoice_id IN (
                    SELECT id FROM invoices WHERE organization_id = org_id
                );

                DELETE FROM invoice_details
                WHERE invoice_id IN (
                    SELECT id FROM invoices WHERE organization_id = org_id
                );

                DELETE FROM invoices WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('invoice');
            END IF;

            IF clean_sales THEN
                UPDATE invoices
                SET withdrawal_id = NULL
                WHERE organization_id = org_id
                  AND withdrawal_id IN (
                    SELECT id FROM withdrawals WHERE organization_id = org_id
                  );

                DELETE FROM cash_transactions
                WHERE sale_id IN (
                    SELECT id FROM withdrawals WHERE organization_id = org_id
                );

                DELETE FROM withdrawal_details
                WHERE withdrawal_id IN (
                    SELECT id FROM withdrawals WHERE organization_id = org_id
                );

                DELETE FROM withdrawals WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('sale', 'withdrawal');
            END IF;

            IF clean_clients THEN
                DELETE FROM account_receivable_payments
                WHERE "accountReceivableId" IN (
                    SELECT id
                    FROM accounts_receivable
                    WHERE organization_id = org_id
                      AND "clientId" IN (
                        SELECT id FROM clients WHERE organization_id = org_id
                      )
                );

                DELETE FROM accounts_receivable
                WHERE organization_id = org_id
                  AND "clientId" IN (
                    SELECT id FROM clients WHERE organization_id = org_id
                  );

                DELETE FROM quotation_details
                WHERE quotation_id IN (
                    SELECT id
                    FROM quotations
                    WHERE organization_id = org_id
                      AND client_id IN (
                        SELECT id FROM clients WHERE organization_id = org_id
                      )
                );

                DELETE FROM quotations
                WHERE organization_id = org_id
                  AND client_id IN (
                    SELECT id FROM clients WHERE organization_id = org_id
                  );

                DELETE FROM client_addresses
                WHERE client_id IN (
                    SELECT id FROM clients WHERE organization_id = org_id
                );

                DELETE FROM client_credits
                WHERE client_id IN (
                    SELECT id FROM clients WHERE organization_id = org_id
                );

                DELETE FROM client_tax_data
                WHERE client_id IN (
                    SELECT id FROM clients WHERE organization_id = org_id
                );

                DELETE FROM clients WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('client', 'quotation');
            END IF;

            IF clean_receptions THEN
                DELETE FROM reception_details
                WHERE reception_id IN (
                    SELECT id FROM receptions WHERE organization_id = org_id
                );

                DELETE FROM receptions WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('reception');
            END IF;

            IF clean_providers THEN
                DELETE FROM expense_payments
                WHERE "expenseId" IN (
                    SELECT id
                    FROM expenses
                    WHERE organization_id = org_id
                      AND "providerId" IN (
                        SELECT id FROM providers WHERE organization_id = org_id
                      )
                );

                DELETE FROM expenses
                WHERE organization_id = org_id
                  AND "providerId" IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                  );

                DELETE FROM account_payable_payments
                WHERE "accountPayableId" IN (
                    SELECT id
                    FROM accounts_payable
                    WHERE organization_id = org_id
                      AND (
                        "providerId" IN (
                          SELECT id FROM providers WHERE organization_id = org_id
                        )
                        OR "purchaseOrderId" IN (
                          SELECT id
                          FROM purchase_orders
                          WHERE organization_id = org_id
                            AND provider_id IN (
                              SELECT id
                              FROM providers
                              WHERE organization_id = org_id
                            )
                        )
                      )
                );

                DELETE FROM accounts_payable
                WHERE organization_id = org_id
                  AND (
                    "providerId" IN (
                      SELECT id FROM providers WHERE organization_id = org_id
                    )
                    OR "purchaseOrderId" IN (
                      SELECT id
                      FROM purchase_orders
                      WHERE organization_id = org_id
                        AND provider_id IN (
                          SELECT id FROM providers WHERE organization_id = org_id
                        )
                    )
                  );

                DELETE FROM purchase_order_details
                WHERE purchase_order_id IN (
                    SELECT id
                    FROM purchase_orders
                    WHERE organization_id = org_id
                      AND provider_id IN (
                        SELECT id FROM providers WHERE organization_id = org_id
                      )
                );

                DELETE FROM purchase_orders
                WHERE organization_id = org_id
                  AND provider_id IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                  );

                DELETE FROM reception_details
                WHERE reception_id IN (
                    SELECT id
                    FROM receptions
                    WHERE organization_id = org_id
                      AND provider_id IN (
                        SELECT id FROM providers WHERE organization_id = org_id
                      )
                );

                DELETE FROM receptions
                WHERE organization_id = org_id
                  AND provider_id IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                  );

                DELETE FROM return_details
                WHERE return_id IN (
                    SELECT id
                    FROM returns
                    WHERE organization_id = org_id
                      AND target_provider_id IN (
                        SELECT id FROM providers WHERE organization_id = org_id
                      )
                );

                DELETE FROM returns
                WHERE organization_id = org_id
                  AND target_provider_id IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                  );

                DELETE FROM provider_addresses
                WHERE provider_id IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                );

                DELETE FROM provider_credits
                WHERE provider_id IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                );

                DELETE FROM provider_tax_data
                WHERE provider_id IN (
                    SELECT id FROM providers WHERE organization_id = org_id
                );

                DELETE FROM providers WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('provider', 'purchase_order', 'reception', 'return');
            END IF;

            IF clean_inventory_stock THEN
                DELETE FROM warehouse_adjustment_details
                WHERE warehouse_adjustment_id IN (
                    SELECT id
                    FROM warehouse_adjustments
                    WHERE organization_id = org_id
                );

                DELETE FROM warehouse_adjustments
                WHERE organization_id = org_id;

                DELETE FROM inventory
                WHERE organization_id = org_id;

                DELETE FROM warehouse_openings
                WHERE organization_id = org_id;

                DELETE FROM product_history
                WHERE organization_id = org_id;

                UPDATE products
                SET total_stock = 0
                WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN ('inventory_adjustment');
            END IF;

            IF clean_products THEN
                DELETE FROM account_payable_payments
                WHERE "accountPayableId" IN (
                    SELECT id
                    FROM accounts_payable
                    WHERE organization_id = org_id
                      AND "purchaseOrderId" IN (
                        SELECT id FROM purchase_orders WHERE organization_id = org_id
                      )
                );

                DELETE FROM accounts_payable
                WHERE organization_id = org_id
                  AND "purchaseOrderId" IN (
                    SELECT id FROM purchase_orders WHERE organization_id = org_id
                  );

                DELETE FROM quotation_details
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM quotations WHERE organization_id = org_id;

                DELETE FROM reception_details
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM receptions WHERE organization_id = org_id;

                DELETE FROM purchase_order_details
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM purchase_orders WHERE organization_id = org_id;

                DELETE FROM return_details
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM returns WHERE organization_id = org_id;

                DELETE FROM warehouse_adjustment_details
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM warehouse_adjustments WHERE organization_id = org_id;

                DELETE FROM inventory
                WHERE organization_id = org_id
                  AND product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                  );

                DELETE FROM warehouse_openings
                WHERE organization_id = org_id
                  AND product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                  );

                DELETE FROM product_prices
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM product_taxes
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM product_history
                WHERE product_id IN (
                    SELECT id FROM products WHERE organization_id = org_id
                );

                DELETE FROM products WHERE organization_id = org_id;

                DELETE FROM surrogates
                WHERE organization_id = org_id
                  AND code IN (
                    'product',
                    'quotation',
                    'purchase_order',
                    'reception',
                    'return',
                    'inventory_adjustment'
                  );
            END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);
      return;
    }

    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS partial_cleanup_organization_data',
    );
    await queryRunner.query(`
      CREATE PROCEDURE partial_cleanup_organization_data(
        IN org_id CHAR(36),
        IN clean_products BOOLEAN,
        IN clean_clients BOOLEAN,
        IN clean_providers BOOLEAN,
        IN clean_quotations BOOLEAN,
        IN clean_receptions BOOLEAN,
        IN clean_inventory_stock BOOLEAN,
        IN clean_sales BOOLEAN,
        IN clean_invoices BOOLEAN
      )
      BEGIN
          DECLARE EXIT HANDLER FOR SQLEXCEPTION
          BEGIN
              ROLLBACK;
              RESIGNAL;
          END;

          START TRANSACTION;

          IF clean_quotations THEN
              DELETE FROM quotation_details
              WHERE quotation_id IN (
                  SELECT id FROM (SELECT id FROM quotations WHERE organization_id = org_id) AS t
              );

              DELETE FROM quotations WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('quotation');
          END IF;

          IF clean_invoices THEN
              UPDATE withdrawals
              SET invoice_id = NULL
              WHERE organization_id = org_id
                AND invoice_id IN (
                  SELECT id FROM (SELECT id FROM invoices WHERE organization_id = org_id) AS t
                );

              DELETE FROM account_receivable_payments
              WHERE accountReceivableId IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM accounts_receivable
                    WHERE organization_id = org_id
                      AND invoiceId IN (
                        SELECT id
                        FROM (SELECT id FROM invoices WHERE organization_id = org_id) AS invoice_rows
                      )
                  ) AS receivable_rows
              );

              DELETE FROM accounts_receivable
              WHERE organization_id = org_id
                AND invoiceId IN (
                  SELECT id FROM (SELECT id FROM invoices WHERE organization_id = org_id) AS t
                );

              DELETE FROM invoice_payments
              WHERE invoice_id IN (
                  SELECT id FROM (SELECT id FROM invoices WHERE organization_id = org_id) AS t
              );

              DELETE FROM invoice_details
              WHERE invoice_id IN (
                  SELECT id FROM (SELECT id FROM invoices WHERE organization_id = org_id) AS t
              );

              DELETE FROM invoices WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('invoice');
          END IF;

          IF clean_sales THEN
              UPDATE invoices
              SET withdrawal_id = NULL
              WHERE organization_id = org_id
                AND withdrawal_id IN (
                  SELECT id FROM (SELECT id FROM withdrawals WHERE organization_id = org_id) AS t
                );

              DELETE FROM cash_transactions
              WHERE sale_id IN (
                  SELECT id FROM (SELECT id FROM withdrawals WHERE organization_id = org_id) AS t
              );

              DELETE FROM withdrawal_details
              WHERE withdrawal_id IN (
                  SELECT id FROM (SELECT id FROM withdrawals WHERE organization_id = org_id) AS t
              );

              DELETE FROM withdrawals WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('sale', 'withdrawal');
          END IF;

          IF clean_clients THEN
              DELETE FROM account_receivable_payments
              WHERE accountReceivableId IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM accounts_receivable
                    WHERE organization_id = org_id
                      AND clientId IN (
                        SELECT id
                        FROM (SELECT id FROM clients WHERE organization_id = org_id) AS client_rows
                      )
                  ) AS receivable_rows
              );

              DELETE FROM accounts_receivable
              WHERE organization_id = org_id
                AND clientId IN (
                  SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) AS t
                );

              DELETE FROM quotation_details
              WHERE quotation_id IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM quotations
                    WHERE organization_id = org_id
                      AND client_id IN (
                        SELECT id
                        FROM (SELECT id FROM clients WHERE organization_id = org_id) AS client_rows
                      )
                  ) AS quotation_rows
              );

              DELETE FROM quotations
              WHERE organization_id = org_id
                AND client_id IN (
                  SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) AS t
                );

              DELETE FROM client_addresses
              WHERE client_id IN (
                  SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) AS t
              );

              DELETE FROM client_credits
              WHERE client_id IN (
                  SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) AS t
              );

              DELETE FROM client_tax_data
              WHERE client_id IN (
                  SELECT id FROM (SELECT id FROM clients WHERE organization_id = org_id) AS t
              );

              DELETE FROM clients WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('client', 'quotation');
          END IF;

          IF clean_receptions THEN
              DELETE FROM reception_details
              WHERE reception_id IN (
                  SELECT id FROM (SELECT id FROM receptions WHERE organization_id = org_id) AS t
              );

              DELETE FROM receptions WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('reception');
          END IF;

          IF clean_providers THEN
              DELETE FROM expense_payments
              WHERE expenseId IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM expenses
                    WHERE organization_id = org_id
                      AND providerId IN (
                        SELECT id
                        FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                      )
                  ) AS expense_rows
              );

              DELETE FROM expenses
              WHERE organization_id = org_id
                AND providerId IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
                );

              DELETE FROM account_payable_payments
              WHERE accountPayableId IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM accounts_payable
                    WHERE organization_id = org_id
                      AND (
                        providerId IN (
                          SELECT id
                          FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                        )
                        OR purchaseOrderId IN (
                          SELECT id
                          FROM (
                            SELECT id
                            FROM purchase_orders
                            WHERE organization_id = org_id
                              AND provider_id IN (
                                SELECT id
                                FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                              )
                          ) AS purchase_order_rows
                        )
                      )
                  ) AS payable_rows
              );

              DELETE FROM accounts_payable
              WHERE organization_id = org_id
                AND (
                  providerId IN (
                    SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
                  )
                  OR purchaseOrderId IN (
                    SELECT id
                    FROM (
                      SELECT id
                      FROM purchase_orders
                      WHERE organization_id = org_id
                        AND provider_id IN (
                          SELECT id
                          FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                        )
                    ) AS purchase_order_rows
                  )
                );

              DELETE FROM purchase_order_details
              WHERE purchase_order_id IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM purchase_orders
                    WHERE organization_id = org_id
                      AND provider_id IN (
                        SELECT id
                        FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                      )
                  ) AS purchase_order_rows
              );

              DELETE FROM purchase_orders
              WHERE organization_id = org_id
                AND provider_id IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
                );

              DELETE FROM reception_details
              WHERE reception_id IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM receptions
                    WHERE organization_id = org_id
                      AND provider_id IN (
                        SELECT id
                        FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                      )
                  ) AS reception_rows
              );

              DELETE FROM receptions
              WHERE organization_id = org_id
                AND provider_id IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
                );

              DELETE FROM return_details
              WHERE return_id IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM returns
                    WHERE organization_id = org_id
                      AND target_provider_id IN (
                        SELECT id
                        FROM (SELECT id FROM providers WHERE organization_id = org_id) AS provider_rows
                      )
                  ) AS return_rows
              );

              DELETE FROM returns
              WHERE organization_id = org_id
                AND target_provider_id IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
                );

              DELETE FROM provider_addresses
              WHERE provider_id IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
              );

              DELETE FROM provider_credits
              WHERE provider_id IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
              );

              DELETE FROM provider_tax_data
              WHERE provider_id IN (
                  SELECT id FROM (SELECT id FROM providers WHERE organization_id = org_id) AS t
              );

              DELETE FROM providers WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('provider', 'purchase_order', 'reception', 'return');
          END IF;

          IF clean_inventory_stock THEN
              DELETE FROM warehouse_adjustment_details
              WHERE warehouse_adjustment_id IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM warehouse_adjustments
                    WHERE organization_id = org_id
                  ) AS adjustment_rows
              );

              DELETE FROM warehouse_adjustments
              WHERE organization_id = org_id;

              DELETE FROM inventory
              WHERE organization_id = org_id;

              DELETE FROM warehouse_openings
              WHERE organization_id = org_id;

              DELETE FROM product_history
              WHERE organization_id = org_id;

              UPDATE products
              SET total_stock = 0
              WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN ('inventory_adjustment');
          END IF;

          IF clean_products THEN
              DELETE FROM account_payable_payments
              WHERE accountPayableId IN (
                  SELECT id
                  FROM (
                    SELECT id
                    FROM accounts_payable
                    WHERE organization_id = org_id
                      AND purchaseOrderId IN (
                        SELECT id
                        FROM (SELECT id FROM purchase_orders WHERE organization_id = org_id) AS purchase_order_rows
                      )
                  ) AS payable_rows
              );

              DELETE FROM accounts_payable
              WHERE organization_id = org_id
                AND purchaseOrderId IN (
                  SELECT id FROM (SELECT id FROM purchase_orders WHERE organization_id = org_id) AS t
                );

              DELETE FROM quotation_details
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM quotations WHERE organization_id = org_id;

              DELETE FROM reception_details
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM receptions WHERE organization_id = org_id;

              DELETE FROM purchase_order_details
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM purchase_orders WHERE organization_id = org_id;

              DELETE FROM return_details
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM returns WHERE organization_id = org_id;

              DELETE FROM warehouse_adjustment_details
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM warehouse_adjustments WHERE organization_id = org_id;

              DELETE FROM inventory
              WHERE organization_id = org_id
                AND product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
                );

              DELETE FROM warehouse_openings
              WHERE organization_id = org_id
                AND product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
                );

              DELETE FROM product_prices
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM product_taxes
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM product_history
              WHERE product_id IN (
                  SELECT id FROM (SELECT id FROM products WHERE organization_id = org_id) AS t
              );

              DELETE FROM products WHERE organization_id = org_id;

              DELETE FROM surrogates
              WHERE organization_id = org_id
                AND code IN (
                  'product',
                  'quotation',
                  'purchase_order',
                  'reception',
                  'return',
                  'inventory_adjustment'
                );
          END IF;

          COMMIT;
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(`
        DROP FUNCTION IF EXISTS partial_cleanup_organization_data(
          UUID,
          BOOLEAN,
          BOOLEAN,
          BOOLEAN,
          BOOLEAN,
          BOOLEAN,
          BOOLEAN,
          BOOLEAN,
          BOOLEAN
        )
      `);
      return;
    }

    await queryRunner.query(
      'DROP PROCEDURE IF EXISTS partial_cleanup_organization_data',
    );
  }
}
