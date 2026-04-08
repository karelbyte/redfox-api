import { DataSource } from 'typeorm';
import { User } from '../../models/user.entity';
import { Role } from '../../models/role.entity';
import { Organization } from '../../models/organization.entity';
import { Subscription } from '../../models/subscription.entity';
import { Plan } from '../../models/plan.entity';
import { hash } from 'bcrypt';

export class UsersSeed {
  public static async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);
    const organizationRepository = dataSource.getRepository(Organization);
    const subscriptionRepository = dataSource.getRepository(Subscription);
    const planRepository = dataSource.getRepository(Plan);

    // Obtain roles
    const adminRole = await roleRepository.findOne({
      where: { code: 'ADMIN' },
    });
    const sellerRole = await roleRepository.findOne({
      where: { code: 'SELLER' },
    });
    const superAdminRole = await roleRepository.findOne({
      where: { code: 'SUPER_ADMIN' },
    });

    // Obtain landlord organization
    const landlordOrg = await organizationRepository.findOne({
      where: { slug: 'landlord' },
    });

    if (!adminRole || !sellerRole || !landlordOrg) {
      console.log(
        '⚠️ Not found roles or landlord organization. Be sure to run permissions, roles and organizations seeds first.',
      );
      return;
    }

    // Create trial subscription for landlord organization if it doesn't exist
    const existingSubscription = await subscriptionRepository.findOne({
      where: { organization_id: landlordOrg.id },
    });

    if (!existingSubscription) {
      const plan = await planRepository.findOne({
        where: { is_active: true },
        order: { created_at: 'ASC' },
      });

      if (plan) {
        const trialStartDate = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        await subscriptionRepository.save({
          organization_id: landlordOrg.id,
          plan_id: plan.id,
          status: 'trial',
          trial_start_date: trialStartDate,
          trial_end_date: trialEndDate,
          stripe_customer_id: `cus_test_${landlordOrg.id}`,
        });

        console.log('✅ Trial subscription created for landlord organization');
      } else {
        console.log('⚠️ No active plan found. Run plans seed first.');
      }
    }

    const users = [
      {
        name: 'Administrador',
        email: 'admin@nitro.com',
        password: await hash('admin123', 10),
        status: true,
        roles: [adminRole],
        organization_id: landlordOrg.id,
      },
      {
        name: 'Vendedor',
        email: 'vendedor@nitro.com',
        password: await hash('seller123', 10),
        status: true,
        roles: [sellerRole],
        organization_id: landlordOrg.id,
      },
      {
        name: 'Master Admin',
        email: 'master@nitro.com',
        password: await hash('7810071Kpd*-', 10),
        status: true,
        roles: [adminRole, ...(superAdminRole ? [superAdminRole] : [])],
        organization_id: landlordOrg.id,
      },
    ];

    for (const userData of users) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        await userRepository.save(userData);
      }
    }
  }
}
