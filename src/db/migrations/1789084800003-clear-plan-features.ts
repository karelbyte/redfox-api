import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La pantalla de pago pinta la lista de características del plan si el plan
 * la trae, y solo recurre a las traducciones cuando está vacía. Como esa
 * lista se guardaba en español y nombraba el CFDI, un usuario en inglés o en
 * chino la veía en español, y uno de fuera de México leía un término que no
 * le corresponde.
 *
 * Vaciarla hace que la pantalla use las traducciones, que existen en los tres
 * idiomas y son neutras. Los planes que tengan una lista propia distinta de
 * la sembrada por defecto se respetan.
 */
const DEFAULT_FEATURES = JSON.stringify([
  'Usuarios ilimitados',
  'Almacenes ilimitados',
  'Productos ilimitados',
  'Todas las estrategias de inventario (FIFO, FEFO, Promedio)',
  'Facturación electrónica (CFDI)',
  'Reportes avanzados',
  'API REST y Webhooks',
  'Soporte prioritario',
]);

export class ClearPlanFeatures1789084800003 implements MigrationInterface {
  name = 'ClearPlanFeatures1789084800003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE plans SET features = NULL WHERE features = $1',
      [DEFAULT_FEATURES],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE plans SET features = $1 WHERE features IS NULL',
      [DEFAULT_FEATURES],
    );
  }
}
