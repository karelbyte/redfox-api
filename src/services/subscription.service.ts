import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { Organization } from '../models/organization.entity';
import { SubscriptionPayment } from '../models/subscription-payment.entity';
import { User } from '../models/user.entity';
import { StripeService } from './stripe.service';
import { SubscriptionEmailService } from './subscription-email.service';
import { CreatePlanDto } from '../dtos/subscription/create-plan.dto';
import { ReferralService } from './referral.service';

const MSG = {
  org_not_found: {
    es: 'Organización no encontrada.',
    en: 'Organization not found.',
  },
  no_active_plan: {
    es: 'No se encontró un plan activo.',
    en: 'No active plan found.',
  },
  sub_not_found: {
    es: 'Suscripción no encontrada.',
    en: 'Subscription not found.',
  },
  already_active: {
    es: 'La suscripción ya está activa.',
    en: 'Subscription is already active.',
  },
  plan_not_found: {
    es: 'Plan seleccionado no encontrado o inactivo.',
    en: 'Selected plan not found or inactive.',
  },
  plan_id_missing: { es: 'Plan no encontrado.', en: 'Plan not found.' },
};

function t(key: keyof typeof MSG, lang = 'es'): string {
  return MSG[key][lang as 'es' | 'en'] ?? MSG[key]['en'];
}

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Plan)
    private planRepository: Repository<Plan>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(SubscriptionPayment)
    private subscriptionPaymentRepository: Repository<SubscriptionPayment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private subscriptionEmailService: SubscriptionEmailService,
    private referralService: ReferralService,
  ) {}

  async createTrialSubscription(
    organizationId: string,
    organizationEmail?: string,
  ) {
    console.log(`[SubscriptionService] createTrialSubscription START — org: ${organizationId}`);

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      console.error(`[SubscriptionService] Organization not found: ${organizationId}`);
      throw new BadRequestException(t('org_not_found'));
    }

    console.log(`[SubscriptionService] Organization found: ${organization.name} | referrer_code: ${organization.referrer_code || 'none'}`);

    let plan: Plan | null = null;

    if (organization.referrer_code) {
      plan = await this.planRepository.findOne({
        where: {
          is_active: true,
          referrer_code: organization.referrer_code,
        },
        order: { created_at: 'ASC' },
      });
      console.log(`[SubscriptionService] Plan by referrer_code (${organization.referrer_code}): ${plan ? plan.name : 'not found'}`);
    }

    if (!plan) {
      plan = await this.planRepository.findOne({
        where: { is_active: true, is_default: true },
        order: { created_at: 'ASC' },
      });
      console.log(`[SubscriptionService] Plan by is_default: ${plan ? plan.name : 'not found'}`);
    }

    if (!plan) {
      plan = await this.planRepository.findOne({
        where: { is_active: true, is_public: true },
        order: { created_at: 'ASC' },
      });
      console.log(`[SubscriptionService] Plan by is_public: ${plan ? plan.name : 'not found'}`);
    }

    if (!plan) {
      console.error(`[SubscriptionService] No active plan found for org: ${organizationId}`);
      throw new BadRequestException(t('no_active_plan'));
    }

    console.log(`[SubscriptionService] Using plan: ${plan.name} (${plan.id})`);

    let stripeCustomer: any;
    try {
      stripeCustomer = await this.stripeService.createCustomer(
        organizationEmail || `org-${organizationId}@redfox.com`,
        organization.name,
      );
      console.log(`[SubscriptionService] Stripe customer created: ${stripeCustomer.id}`);
    } catch (stripeError) {
      console.error(`[SubscriptionService] Stripe createCustomer failed:`, stripeError?.message || stripeError);
      throw stripeError;
    }

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
    console.log(`[SubscriptionService] Subscription created: ${savedSubscription.id} | trial ends: ${trialEndDate.toISOString()}`);

    await this.organizationRepository.update(organizationId, {
      plan_id: plan.id,
      subscription_id: savedSubscription.id,
    });
    console.log(`[SubscriptionService] Organization updated with plan_id and subscription_id`);

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
      throw new BadRequestException(t('sub_not_found'));
    }

    if (
      subscription.status !== 'trial' &&
      subscription.status !== 'inactive' &&
      subscription.status !== 'expired'
    ) {
      throw new BadRequestException(t('already_active'));
    }

    if (!subscription.stripe_customer_id) {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });
      const users = await this.organizationRepository.manager
        .getRepository('User')
        .find({ where: { organization_id: organizationId } } as any);
      const email =
        (users[0] as any)?.email || `org-${organizationId}@nitro.app`;
      const stripeCustomer = await this.stripeService.createCustomer(
        email,
        organization?.name || organizationId,
      );
      subscription.stripe_customer_id = stripeCustomer.id;
      await this.subscriptionRepository.update(subscription.id, {
        stripe_customer_id: stripeCustomer.id,
      });
    }

    let selectedPlan = subscription.plan;
    if (planId) {
      const newPlan = await this.planRepository.findOne({
        where: { id: planId, is_active: true },
      });

      if (!newPlan) {
        throw new BadRequestException(t('plan_not_found'));
      }

      selectedPlan = newPlan;
      subscription.plan_id = planId;
      await this.subscriptionRepository.update(subscription.id, {
        plan_id: planId,
      });
    }

    const paymentIntent = await this.stripeService.createPaymentIntent(
      subscription.stripe_customer_id,
      selectedPlan.price,
      paymentMethodId,
    );

    await this.subscriptionRepository.update(subscription.id, {
      stripe_payment_intent_id: paymentIntent.id,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  }

  async confirmSubscriptionPayment(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new BadRequestException(t('sub_not_found'));
    }

    if (subscription.status === 'active') {
      return subscription;
    }

    const now = new Date();
    const endDate = new Date(now);
    const billingPeriod = subscription.plan?.billing_period || 'monthly';
    if (billingPeriod === 'yearly' || billingPeriod === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (billingPeriod === 'lifetime') {
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    subscription.status = 'active';
    subscription.subscription_start_date = now;
    subscription.subscription_end_date = endDate;
    subscription.current_period_start = now;
    subscription.current_period_end = endDate;

    await this.subscriptionRepository.save(subscription);

    await this.organizationRepository.update(subscription.organization_id, {
      plan_id: subscription.plan_id,
    });

    try {
      const payment = this.subscriptionPaymentRepository.create({
        subscription_id: subscriptionId,
        stripe_payment_intent_id: subscription.stripe_payment_intent_id,
        amount: subscription.plan?.price ?? 0,
        currency: subscription.plan?.currency ?? 'MXN',
        status: 'succeeded',
        payment_method: 'card',
        paid_at: now,
      });
      await this.subscriptionPaymentRepository.save(payment);
    } catch (e) {
      console.warn('Error registrando pago de suscripción:', e);
    }

    try {
      const org = await this.organizationRepository.findOne({
        where: { id: subscription.organization_id },
      });
      if (org?.referrer_code) {
        await this.referralService.generateCommissionForPayment({
          organizationId: subscription.organization_id,
          referrerCode: org.referrer_code,
          planName: subscription.plan?.name ?? 'Plan',
          planPrice: Number(subscription.plan?.price ?? 0),
        });
      }
    } catch (e) {
      console.warn('Error generando comisión de referido:', e);
    }

    try {
      const user = await this.userRepository.findOne({
        where: { organization_id: subscription.organization_id },
        order: { created_at: 'ASC' },
      });
      const organization = await this.organizationRepository.findOne({
        where: { id: subscription.organization_id },
      });

      if (user && organization) {
        await this.subscriptionEmailService.sendPaymentConfirmation({
          to: user.email,
          userName: user.name,
          organizationName: organization.name,
          planName: subscription.plan?.name ?? 'Plan Nitro',
          billingPeriod: subscription.plan?.billing_period ?? 'monthly',
          amount: Number(subscription.plan?.price ?? 0),
          currency: subscription.plan?.currency ?? 'MXN',
          periodStart: now,
          periodEnd: endDate,
          paymentIntentId: subscription.stripe_payment_intent_id ?? undefined,
        });
      }
    } catch (e) {
      console.warn('Error enviando email de confirmación de suscripción:', e);
    }

    return subscription;
  }

  async processManualPayment(subscriptionId: string, amount?: number, notes?: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['plan', 'organization'],
    });

    if (!subscription) {
      throw new BadRequestException(t('sub_not_found'));
    }

    const now = new Date();
    // Si la suscripción ya está activa y no ha vencido, extendemos desde la fecha de vencimiento actual
    // Si está vencida o en trial, extendemos desde hoy
    let startDate = new Date();
    if (subscription.status === 'active' && subscription.current_period_end > now) {
      startDate = new Date(subscription.current_period_end);
    }

    const endDate = new Date(startDate);
    const billingPeriod = subscription.plan?.billing_period || 'monthly';
    
    if (billingPeriod === 'yearly' || billingPeriod === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (billingPeriod === 'lifetime') {
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Actualizar suscripción
    subscription.status = 'active';
    if (!subscription.subscription_start_date) {
      subscription.subscription_start_date = now;
    }
    subscription.subscription_end_date = endDate;
    subscription.current_period_start = startDate;
    subscription.current_period_end = endDate;
    // Limpiar campos de Stripe si se paga manual para evitar conflictos, o mantenerlos si se desea trazabilidad
    subscription.stripe_payment_intent_id = `MANUAL-${now.getTime()}`;

    await this.subscriptionRepository.save(subscription);

    // Asegurar que la organización tenga el plan correcto
    await this.organizationRepository.update(subscription.organization_id, {
      plan_id: subscription.plan_id,
    });

    // Registrar el pago manual
    try {
      const payment = this.subscriptionPaymentRepository.create({
        subscription_id: subscriptionId,
        stripe_payment_intent_id: subscription.stripe_payment_intent_id,
        amount: amount ?? (subscription.plan?.price ?? 0),
        currency: subscription.plan?.currency ?? 'MXN',
        status: 'succeeded',
        payment_method: 'cash', // Marcamos como efectivo
        paid_at: now,
        notes: notes || 'Pago manual registrado por administrador',
      } as any); // Usamos any por si 'notes' o 'cash' no están en la entidad estrictamente pero se permiten en DB
      await this.subscriptionPaymentRepository.save(payment);
    } catch (e) {
      console.warn('Error registrando pago manual:', e);
    }

    // Enviar confirmación por email
    try {
      const user = await this.userRepository.findOne({
        where: { organization_id: subscription.organization_id },
        order: { created_at: 'ASC' },
      });

      if (user) {
        await this.subscriptionEmailService.sendPaymentConfirmation({
          to: user.email,
          userName: user.name,
          organizationName: subscription.organization?.name || 'Empresa',
          planName: subscription.plan?.name ?? 'Plan Nitro',
          billingPeriod: subscription.plan?.billing_period ?? 'monthly',
          amount: amount ?? Number(subscription.plan?.price ?? 0),
          currency: subscription.plan?.currency ?? 'MXN',
          periodStart: startDate,
          periodEnd: endDate,
          paymentIntentId: subscription.stripe_payment_intent_id,
        });
      }
    } catch (e) {
      console.warn('Error enviando email de confirmación manual:', e);
    }

    return subscription;
  }

  async handleStripeEvent(event: any) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const subscriptionByPI = await this.subscriptionRepository.findOne({
          where: { stripe_payment_intent_id: paymentIntent.id },
        });
        if (subscriptionByPI) {
          await this.confirmSubscriptionPayment(subscriptionByPI.id);
        }
        break;
      case 'invoice.paid':
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscriptionByStripeId = await this.subscriptionRepository.findOne({
            where: { stripe_subscription_id: invoice.subscription },
          });
          if (subscriptionByStripeId) {
            await this.confirmSubscriptionPayment(subscriptionByStripeId.id);
          }
        }
        break;
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        if (failedInvoice.subscription) {
          const subscriptionToFail = await this.subscriptionRepository.findOne({
            where: { stripe_subscription_id: failedInvoice.subscription },
          });
          if (subscriptionToFail) {
            await this.subscriptionRepository.update(subscriptionToFail.id, {
              status: 'past_due',
            });
            // Aquí se podría enviar un email de aviso de fallo de pago
          }
        }
        break;
      case 'customer.subscription.deleted':
        const stripeSub = event.data.object;
        const subToDelete = await this.subscriptionRepository.findOne({
          where: { stripe_subscription_id: stripeSub.id },
        });
        if (subToDelete) {
          await this.subscriptionRepository.update(subToDelete.id, {
            status: 'canceled',
            canceled_at: new Date(),
          });
        }
        break;
    }
  }

  async createPlan(createPlanDto: CreatePlanDto) {
    const plan = this.planRepository.create({
      ...createPlanDto,
      features: createPlanDto.features
        ? (JSON.stringify(createPlanDto.features) as any)
        : null,
    });
    const saved = await this.planRepository.save(plan);
    return this.parsePlanFeatures(saved);
  }

  async getAllPlans(organizationReferrerCode?: string) {
    const where: any = { is_active: true };

    if (organizationReferrerCode) {
      where.referrer_code = organizationReferrerCode;
    } else {
      where.is_public = true;
      where.referrer_code = null as any;
    }

    const plans = await this.planRepository.find({
      where,
    });
    
    return plans.map((p) => this.parsePlanFeatures(p));
  }

  async getAllPlansAdmin() {
    const plans = await this.planRepository.find({
      where: { is_active: true },
    });
    return plans.map((p) => this.parsePlanFeatures(p));
  }

  async getPlanById(id: string) {
    const plan = await this.planRepository.findOne({ where: { id } });
    return plan ? this.parsePlanFeatures(plan) : null;
  }

  async updatePlan(id: string, data: Partial<Plan>) {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) {
      throw new BadRequestException(t('plan_id_missing'));
    }
    const updateData: any = { ...data };
    if (data.features !== undefined) {
      updateData.features = Array.isArray(data.features)
        ? JSON.stringify(data.features)
        : data.features;
    }
    Object.assign(plan, updateData);
    const saved = await this.planRepository.save(plan);
    return this.parsePlanFeatures(saved);
  }

  private parsePlanFeatures(plan: Plan): Plan & { features: string[] } {
    let features: string[] = [];
    if (plan.features) {
      try {
        features =
          typeof plan.features === 'string'
            ? JSON.parse(plan.features as any)
            : plan.features;
      } catch {
        features = [];
      }
    }
    return { ...plan, features };
  }
}
