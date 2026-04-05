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

// Subscription error messages — inline bilingual (no DB lookup needed for subscriptions)
const MSG = {
  org_not_found:    { es: 'Organización no encontrada.',           en: 'Organization not found.' },
  no_active_plan:   { es: 'No se encontró un plan activo.',        en: 'No active plan found.' },
  sub_not_found:    { es: 'Suscripción no encontrada.',            en: 'Subscription not found.' },
  already_active:   { es: 'La suscripción ya está activa.',        en: 'Subscription is already active.' },
  plan_not_found:   { es: 'Plan seleccionado no encontrado o inactivo.', en: 'Selected plan not found or inactive.' },
  plan_id_missing:  { es: 'Plan no encontrado.',                   en: 'Plan not found.' },
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

  async createTrialSubscription(organizationId: string, organizationEmail?: string) {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new BadRequestException(t('org_not_found'));
    }

    const plan = await this.planRepository.findOne({
      where: { is_active: true },
      order: { created_at: 'ASC' },
    });

    if (!plan) {
      throw new BadRequestException(t('no_active_plan'));
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
      throw new BadRequestException(t('sub_not_found'));
    }

    // Permitir pago si está en trial o si está inactiva/expirada
    if (subscription.status !== 'trial' && subscription.status !== 'inactive' && subscription.status !== 'expired') {
      throw new BadRequestException(t('already_active'));
    }

    // Si no tiene stripe_customer_id, crearlo ahora
    if (!subscription.stripe_customer_id) {
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });
      const users = await this.organizationRepository.manager
        .getRepository('User')
        .find({ where: { organization_id: organizationId } } as any);
      const email = (users[0] as any)?.email || `org-${organizationId}@nitro.app`;
      const stripeCustomer = await this.stripeService.createCustomer(
        email,
        organization?.name || organizationId,
      );
      subscription.stripe_customer_id = stripeCustomer.id;
      // Guardar solo el customer_id, sin tocar plan_id
      await this.subscriptionRepository.update(subscription.id, {
        stripe_customer_id: stripeCustomer.id,
      });
    }

    // Si se proporciona un planId, actualizar el plan de la suscripción
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
      // Guardar solo el plan_id de forma explícita
      await this.subscriptionRepository.update(subscription.id, {
        plan_id: planId,
      });
    }

    // Crear el PaymentIntent con el payment method adjunto usando el precio del plan seleccionado
    const paymentIntent = await this.stripeService.createPaymentIntent(
      subscription.stripe_customer_id,
      selectedPlan.price,
      paymentMethodId,
    );

    // Guardar el payment_intent_id en la suscripción para referencia
    await this.subscriptionRepository.update(subscription.id, {
      stripe_payment_intent_id: paymentIntent.id,
    });

    // NO cambiar el estado aquí - se cambiará cuando el pago sea confirmado
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

    const now = new Date();
    const endDate = new Date(now);

    // Calcular duración según el billing_period del plan elegido
    const billingPeriod = subscription.plan?.billing_period || 'monthly';
    if (billingPeriod === 'yearly' || billingPeriod === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (billingPeriod === 'lifetime') {
      endDate.setFullYear(endDate.getFullYear() + 100);
    } else {
      // monthly por defecto
      endDate.setMonth(endDate.getMonth() + 1);
    }

    subscription.status = 'active';
    subscription.subscription_start_date = now;
    subscription.subscription_end_date = endDate;
    subscription.current_period_start = now;
    subscription.current_period_end = endDate;

    await this.subscriptionRepository.save(subscription);

    // Actualizar la organización con el plan correcto
    await this.organizationRepository.update(subscription.organization_id, {
      plan_id: subscription.plan_id,
    });

    // Registrar el pago en subscription_payments
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
      // No bloquear el flujo si falla el registro del pago
      console.warn('Error registrando pago de suscripción:', e);
    }

    // Generar comisión de referido si aplica
    try {
      const org = await this.organizationRepository.findOne({ where: { id: subscription.organization_id } });
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

    // Enviar email de confirmación de pago (sin bloquear el flujo)
    try {      const user = await this.userRepository.findOne({
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

  async createPlan(createPlanDto: CreatePlanDto) {
    const plan = this.planRepository.create({
      ...createPlanDto,
      features: createPlanDto.features ? JSON.stringify(createPlanDto.features) as any : null,
    });
    const saved = await this.planRepository.save(plan);
    return this.parsePlanFeatures(saved);
  }

  async getAllPlans() {
    // Solo planes públicos — para la vista del cliente en el front
    const plans = await this.planRepository.find({
      where: { is_active: true, is_public: true },
    });
    return plans.map(p => this.parsePlanFeatures(p));
  }

  async getAllPlansAdmin() {
    // Todos los planes (públicos y privados) — para el admin
    const plans = await this.planRepository.find({
      where: { is_active: true },
    });
    return plans.map(p => this.parsePlanFeatures(p));
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
        features = typeof plan.features === 'string'
          ? JSON.parse(plan.features as any)
          : plan.features;
      } catch { features = []; }
    }
    return { ...plan, features };
  }
}
