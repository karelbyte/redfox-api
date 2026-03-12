import { DataSource } from 'typeorm';
import { Plan } from '../../models/plan.entity';

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
        is_active: true,
      },
      {
        name: 'Plan Anual',
        version: '1.0',
        price: 6500.00,
        currency: 'MXN',
        billing_period: 'yearly',
        description: 'Plan anual con todas las características incluidas - Ahorra más de 1 mes',
        is_active: true,
      },
    ];

    for (const plan of plans) {
      const existingPlan = await planRepository.findOne({
        where: { name: plan.name, version: plan.version },
      });

      if (!existingPlan) {
        await planRepository.save(plan);
      }
    }
  }
}
