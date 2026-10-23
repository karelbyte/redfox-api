import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { SubscriptionService } from '../../services/subscription.service';
import { StripeEventHandler } from '../stripe-event-handler.interface';

/**
 * Algo cambió en la suscripción, normalmente desde el portal de Stripe: el
 * cliente desactivó la renovación automática o cambió de plan. Sin este
 * evento, la aplicación mostraría un estado que ya no es cierto.
 */
@Injectable()
export class SubscriptionUpdatedHandler implements StripeEventHandler {
  readonly handles = 'customer.subscription.updated';

  constructor(private readonly subscriptions: SubscriptionService) {}

  async handle(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription & {
      current_period_end?: number;
    };

    await this.subscriptions.syncFromStripe({
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      periodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
    });
  }
}
