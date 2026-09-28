import { MigrationInterface, QueryRunner } from 'typeorm';

import { COUNTRIES, DEFAULT_COUNTRY } from '../../constants/countries.constant';

/**
 * Rellena la moneda de las facturas que se emitieron sin ella.
 *
 * `currency_code` era opcional y nadie lo enviaba, así que quedó nulo en
 * todas. Sin ese dato la pantalla de detalle no sabía en qué moneda estaba la
 * factura y caía en un 'MXN' escrito a mano: una boleta peruana se mostraba
 * en pesos mexicanos.
 *
 * Se toma la moneda del país de la organización que emitió. Es una
 * aproximación, pero la correcta: hasta hoy cada organización ha operado en
 * la moneda de su país, que es justamente lo que el dato faltante describía.
 */
export class BackfillInvoiceCurrency1789084800009
  implements MigrationInterface
{
  name = 'BackfillInvoiceCurrency1789084800009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const profile of Object.values(COUNTRIES)) {
      await queryRunner.query(
        `UPDATE invoices SET currency_code = $1
         WHERE currency_code IS NULL
           AND organization_id IN (
             SELECT id FROM organizations WHERE upper(country) = $2
           )`,
        [profile.currency, profile.code],
      );
    }

    // Una organización sin país declarado es de antes de que el país
    // existiera, y esas son todas mexicanas.
    await queryRunner.query(
      `UPDATE invoices SET currency_code = $1
       WHERE currency_code IS NULL
         AND organization_id IN (
           SELECT id FROM organizations WHERE country IS NULL
         )`,
      [COUNTRIES[DEFAULT_COUNTRY].currency],
    );
  }

  public async down(): Promise<void> {
    // No se revierte: distinguir las facturas que esta migración rellenó de
    // las que ya traían moneda exigiría guardar ese rastro, y vaciar todas
    // perdería el dato de las que sí la tenían.
  }
}
