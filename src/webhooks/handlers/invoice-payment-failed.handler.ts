import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { SubscriptionService } from '../../services/subscription.service';
import { StripeEventHandler } from '../stripe-event-handler.interface';
import { subscriptionIdFromInvoice } from '../invoice-subscription';

/**
 * No se pudo cobrar la renovación. No se corta el acceso aquí: Stripe
 * reintenta durante varios días según su configuración, y si finalmente se
 * rinde envía customer.subscription.deleted, que sí cierra.
 */
@Injectable()
export class InvoicePaymentFailedHandler implements StripeEventHandler {
  readonly handles = 'invoice.payment_failed';

  constructor(private readonly subscriptions: SubscriptionService) {}

  async handle(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId = subscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) return;

    await this.subscriptions.markPastDue(stripeSubscriptionId);
  }
}
