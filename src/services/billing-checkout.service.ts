import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Organization } from '../models/organization.entity';
import { Plan } from '../models/plan.entity';
import { Subscription } from '../models/subscription.entity';
import { User } from '../models/user.entity';
import { StripeService } from './stripe.service';
import { DEFAULT_COUNTRY } from '../constants/countries.constant';

/**
 * Lleva a la organización hasta la pantalla de pago de Stripe y de vuelta.
 *
 * No hay una versión por país. Lo que cambia entre México y Perú es el precio
 * y la moneda, y eso son datos: el plan se elige por el país de la
 * organización y cada plan ya sabe en qué moneda se cobra. Separar la clase
 * por país obligaría a mantener dos copias idénticas salvo una constante.
 *
 * El día que un país necesite otro proveedor de cobro —y no solo otro
 * precio— corresponde una interfaz con una implementación por país, como la
 * que ya existe para los packs de certificación. Ese día habrá una razón.
 */
@Injectable()
export class BillingCheckoutService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Devuelve la URL donde la organización paga su suscripción.
   *
   * `planId` es opcional: si no viene, se toma el plan marcado por defecto
   * para el país de la organización.
   */
  async startCheckout(
    organizationId: string,
    tenantSlug: string,
    planId?: string,
  ): Promise<{ url: string }> {
    const subscription = await this.findSubscription(organizationId);
    const plan = await this.resolvePlan(organizationId, planId);

    if (!plan.stripe_lookup_key) {
      throw new BadRequestException(
        `El plan '${plan.name}' no tiene configurado su precio en Stripe`,
      );
    }

    const price = await this.stripeService.findPriceByLookupKey(
      plan.stripe_lookup_key,
    );
    const customerId = await this.ensureCustomer(subscription, organizationId);

    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId: price.id,
      clientReferenceId: organizationId,
      successUrl: this.frontendUrl(tenantSlug, 'suscripcion?pago=exitoso'),
      cancelUrl: this.frontendUrl(tenantSlug, 'suscripcion/pago'),
      trialDays: this.remainingTrialDays(subscription),
    });

    if (!session.url) {
      throw new BadRequestException('Stripe no devolvió una URL de pago');
    }

    // El plan elegido se guarda ya: el webhook de confirmación llega sin él y
    // necesita saber qué se compró para calcular el período.
    if (subscription.plan_id !== plan.id) {
      await this.subscriptionRepository.update(subscription.id, {
        plan_id: plan.id,
      });
    }

    return { url: session.url };
  }

  /**
   * Devuelve la URL del portal donde la organización gestiona su suscripción.
   *
   * El cliente sale de la organización autenticada y nunca de la petición: si
   * se aceptara un identificador de cliente desde fuera, cualquiera que
   * adivinara uno ajeno abriría la facturación de otra organización.
   */
  async openBillingPortal(
    organizationId: string,
    tenantSlug: string,
  ): Promise<{ url: string }> {
    const subscription = await this.findSubscription(organizationId);

    if (!subscription.stripe_customer_id) {
      throw new BadRequestException(
        'La organización todavía no tiene un cliente de Stripe',
      );
    }

    const session = await this.stripeService.createBillingPortalSession(
      subscription.stripe_customer_id,
      this.frontendUrl(tenantSlug, 'suscripcion'),
    );

    return { url: session.url };
  }

  private async findSubscription(
    organizationId: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organization_id: organizationId },
      order: { created_at: 'DESC' },
    });

    if (!subscription) {
      throw new BadRequestException(
        'La organización no tiene una suscripción',
      );
    }

    return subscription;
  }

  /**
   * Elige el plan a cobrar. Los planes sin país siguen siendo visibles para
   * todos, que es como se comportaban antes de existir la columna.
   */
  private async resolvePlan(
    organizationId: string,
    planId?: string,
  ): Promise<Plan> {
    if (planId) {
      const requested = await this.planRepository.findOne({
        where: { id: planId, is_active: true },
      });

      if (!requested) {
        throw new BadRequestException('El plan indicado no existe');
      }

      return requested;
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    const country = (organization?.country || DEFAULT_COUNTRY).toUpperCase();

    const candidates = await this.planRepository.find({
      where: [
        { is_active: true, is_public: true, country },
        { is_active: true, is_public: true, country: IsNull() },
      ],
      order: { created_at: 'ASC' },
    });

    const plan = candidates.find((p) => p.is_default) || candidates[0];

    if (!plan) {
      throw new BadRequestException(
        `No hay planes disponibles para el país ${country}`,
      );
    }

    return plan;
  }

  private async ensureCustomer(
    subscription: Subscription,
    organizationId: string,
  ): Promise<string> {
    if (subscription.stripe_customer_id) {
      return subscription.stripe_customer_id;
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    const user = await this.userRepository.findOne({
      where: { organization_id: organizationId },
      order: { created_at: 'ASC' },
    });

    const customer = await this.stripeService.createCustomer(
      user?.email || `org-${organizationId}@nitro.app`,
      organization?.name || organizationId,
    );

    await this.subscriptionRepository.update(subscription.id, {
      stripe_customer_id: customer.id,
    });

    return customer.id;
  }

  /**
   * Días de prueba que todavía le quedan a la organización, o ninguno si ya
   * la agotó. Pedirle a Stripe una prueba nueva a quien ya la gastó sería
   * regalarle otro período cada vez que vuelve a la pantalla de pago.
   */
  private remainingTrialDays(subscription: Subscription): number {
    if (!subscription.trial_end_date) return 0;

    const remaining = Math.ceil(
      (new Date(subscription.trial_end_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    return Math.max(0, remaining);
  }

  private frontendUrl(tenantSlug: string, path: string): string {
    const base = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5501'
    ).replace(/\/$/, '');

    return `${base}/${tenantSlug}/es/dashboard/${path}`;
  }
}
