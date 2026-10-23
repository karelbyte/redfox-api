import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

import { SubscriptionService } from '../../services/subscription.service';
import { StripeEventHandler } from '../stripe-event-handler.interface';

/**
 * La compra se completó. Es el único momento en que Stripe nos dice de qué
 * organización era: viaja en client_reference_id, que pusimos al abrir la
 * sesión. De aquí en adelante la suscripción se reconoce por su propio
 * identificador.
 */
@Injectable()
export class CheckoutSessionCompletedHandler implements StripeEventHandler {
  readonly handles = 'checkout.session.completed';
  private readonly logger = new Logger(CheckoutSessionCompletedHandler.name);

  constructor(private readonly subscriptions: SubscriptionService) {}

  async handle(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode !== 'subscription') return;

    const organizationId = session.client_reference_id;
    const stripeSubscriptionId = session.subscription as string;

    if (!organizationId || !stripeSubscriptionId) {
      this.logger.warn(
        `Sesión sin organización o sin suscripción: ${session.id}`,
      );
      return;
    }

    // Las fechas reales del período las trae la factura que llega enseguida;
    // aquí se deja el arranque para que el acceso no dependa de ese orden.
    const ahora = new Date();

    await this.subscriptions.activateFromStripe({
      organizationId,
      stripeSubscriptionId,
      periodStart: ahora,
      periodEnd: ahora,
    });
  }
}
