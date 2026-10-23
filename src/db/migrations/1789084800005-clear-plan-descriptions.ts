import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La descripción del plan anual terminaba en "Ahorra más de 1 mes". Ese
 * ahorro ahora lo calcula la pantalla a partir de los precios reales, así que
 * el texto fijo sobraba y, peor, se contradecía con el cartel cuando los
 * importes cambiaban: con los precios de hoy el ahorro es de dos meses.
 *
 * Las descripciones también se guardaban solo en español, igual que la lista
 * de características que vació 1789084800003. Vaciarlas hace que la pantalla
 * use las traducciones, que existen en los tres idiomas y no prometen nada
 * que no se pueda calcular. Solo se tocan las descripciones sembradas por
 * defecto: si alguien escribió una propia, se respeta.
 */
const SEEDED_DESCRIPTIONS: Record<string, string> = {
  monthly: 'Plan mensual con todas las características incluidas',
  yearly: 'Plan anual con todas las características incluidas - Ahorra más de 1 mes',
};

export class ClearPlanDescriptions1789084800005 implements MigrationInterface {
  name = 'ClearPlanDescriptions1789084800005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [period, description] of Object.entries(SEEDED_DESCRIPTIONS)) {
      await queryRunner.query(
        'UPDATE plans SET description = NULL WHERE billing_period = $1 AND description = $2',
        [period, description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [period, description] of Object.entries(SEEDED_DESCRIPTIONS)) {
      await queryRunner.query(
        'UPDATE plans SET description = $1 WHERE billing_period = $2 AND description IS NULL',
        [description, period],
      );
    }
  }
}
