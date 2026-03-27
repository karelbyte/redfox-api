import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { Organization } from '../models/organization.entity';
import { StripeService } from './stripe.service';
import { CreatePlanDto } from '../dtos/subscription/create-plan.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private stripeService: StripeService,
  ) {}

  async createTrialSubscription(organizationId: string, organizationEmail?: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found');
    }

    const plan = await this.planRepository.findOne({
      where: { is_active: true },
      order: { created_at: 'ASC' },
    });

    if (!plan) {
      throw new BadRequestException('No active plan found');
    }

    const stripeCustomer = await this.stripeService.createCustomer(
      organizationEmail || `org-${organizationId}@redfox.com`,
      organization.name,
    );

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const subscription = this.subscriptionRepository.create({
      organization_id: organizationId,
      plan_id: plan.id,
      status: 'trial',
      trial_start_date: trialStartDate,
      trial_end_date: trialEndDate,
      stripe_customer_id: stripeCustomer.id,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    await this.organizationRepository.update(organizationId, {
      plan_id: plan.id,
      subscription_id: savedSubscription.id,
    });

    return savedSubscription;
  }

  async isSubscriptionActive(organizationId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organization_id: organizationId },
    });

    if (!subscription) {
      return false;
    }

    const now = new Date();

    if (subscription.status === 'trial') {
      const trialEndDate = new Date(subscription.trial_end_date);
      return now <= trialEndDate;
    }

    if (subscription.status === 'active') {
      const currentPeriodEnd = new Date(subscription.current_period_end);
      return currentPeriodEnd > now;
    }

    return false;
  }

  async getTrialDaysRemaining(organizationId: string): Promise<number> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organization_id: organizationId },
    });

    if (!subscription || subscription.status !== 'trial') {
      return 0;
    }

    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.trial_end_date.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return Math.max(0, daysRemaining);
  }

  async getSubscriptionStatus(organizationId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organization_id: organizationId },
      relations: ['plan'],
    });

    if (!subscription) {
      return {
        hasSubscription: false,
        isActive: false,
        status: null,
        daysRemaining: 0,
        plan: null,
      };
    }

    const isActive = await this.isSubscriptionActive(organizationId);
    const daysRemaining = await this.getTrialDaysRemaining(organizationId);

    return {
      hasSubscription: true,
      isActive,
      status: subscription.status,
      daysRemaining,
      plan: subscription.plan,
      trialEndDate: subscription.trial_end_date,
      subscriptionEndDate: subscription.subscription_end_date,
    };
  }

  async convertTrialToSubscription(
    organizationId: string,
    paymentMethodId: string,
    planId?: string,
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organization_id: organizationId },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    // Permitir pago si está en trial o si está inactiva/expirada
    if (subscription.status !== 'trial' && subscription.status !== 'inactive' && subscription.status !== 'expired') {
      throw new BadRequestException('Subscription is already active');
    }

    // Si se proporciona un planId, actualizar el plan de la suscripción
    let selectedPlan = subscription.plan;
    if (planId) {
      const newPlan = await this.planRepository.findOne({
        where: { id: planId, is_active: true },
      });
      
      if (!newPlan) {
        throw new BadRequestException('Selected plan not found or inactive');
      }
      
      selectedPlan = newPlan;
      subscription.plan_id = planId;
      await this.subscriptionRepository.save(subscription);
    }

    // Crear el PaymentIntent con el payment method adjunto usando el precio del plan seleccionado
    const paymentIntent = await this.stripeService.createPaymentIntent(
      subscription.stripe_customer_id,
      selectedPlan.price,
      paymentMethodId,
    );

    // Guardar el payment_intent_id en la suscripción para referencia
    subscription.stripe_payment_intent_id = paymentIntent.id;
    await this.subscriptionRepository.save(subscription);

    // NO cambiar el estado aquí - se cambiará cuando el pago sea confirmado
    return {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  }

  async confirmSubscriptionPayment(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }

    // Cambiar el estado a activo después de confirmar el pago
    subscription.status = 'active';
    subscription.subscription_start_date = new Date();
    subscription.subscription_end_date = new Date();
    subscription.subscription_end_date.setMonth(
      subscription.subscription_end_date.getMonth() + 1,
    );
    subscription.current_period_start = new Date();
    subscription.current_period_end = new Date();
    subscription.current_period_end.setMonth(
      subscription.current_period_end.getMonth() + 1,
    );

    await this.subscriptionRepository.save(subscription);

    return subscription;
  }

  async createPlan(createPlanDto: CreatePlanDto) {
    const plan = this.planRepository.create(createPlanDto);
    return this.planRepository.save(plan);
  }

  async getAllPlans() {
    return this.planRepository.find({ where: { is_active: true } });
  }

  async getPlanById(id: string) {
    return this.planRepository.findOne({ where: { id } });
  }

  async updatePlan(id: string, data: Partial<Plan>) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new BadRequestException('Plan not found');
    }
    Object.assign(plan, data);
    return this.planRepository.save(plan);
  }
}
