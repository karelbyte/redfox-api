import { DataSource } from 'typeorm';
import { Plan } from '../../models/plan.entity';

const DEFAULT_FEATURES = [
  'Usuarios ilimitados',
  'Almacenes ilimitados',
  'Productos ilimitados',
  'Todas las estrategias de inventario (FIFO, FEFO, Promedio)',
  'Facturación electrónica (CFDI)',
  'Reportes avanzados',
  'API REST y Webhooks',
  'Soporte prioritario',
];

export class PlansSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const planRepository = dataSource.getRepository(Plan);

    const plans = [
      {
        name: 'Plan Mensual',
        version: '1.0',
        price: 700.00,
        currency: 'MXN',
        billing_period: 'monthly',
        description: 'Plan mensual con todas las características incluidas',
        features: DEFAULT_FEATURES,
        is_default: true,
        is_active: true,
      },
      {
        name: 'Plan Anual',
        version: '1.0',
        price: 6500.00,
        currency: 'MXN',
        billing_period: 'yearly',
        description: 'Plan anual con todas las características incluidas - Ahorra más de 1 mes',
        features: DEFAULT_FEATURES,
        is_default: false,
        is_active: true,
      },
    ];

    for (const plan of plans) {
      const existingPlan = await planRepository.findOne({
        where: { name: plan.name, version: plan.version },
      });

      if (!existingPlan) {
        await planRepository.save(plan);
      } else {
        // Actualizar features e is_default si ya existe pero no los tiene
        if (!existingPlan.features || existingPlan.features.length === 0) {
          await planRepository.update(existingPlan.id, {
            features: plan.features,
            is_default: plan.is_default,
          });
        }
      }
    }
  }
}
