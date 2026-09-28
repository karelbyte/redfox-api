import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { SubscriptionService } from '../../services/subscription.service';
import { StripeEventHandler } from '../stripe-event-handler.interface';

/** La suscripción terminó: la canceló el cliente o Stripe agotó los reintentos. */
@Injectable()
export class SubscriptionDeletedHandler implements StripeEventHandler {
  readonly handles = 'customer.subscription.deleted';

  constructor(private readonly subscriptions: SubscriptionService) {}

  async handle(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;

    await this.subscriptions.cancelFromStripe(subscription.id);
  }
}
