import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import { SubscriptionService } from '../../services/subscription.service';
import { StripeEventHandler } from '../stripe-event-handler.interface';
import { subscriptionIdFromInvoice } from '../invoice-subscription';

/**
 * Una factura se cobró. Llega con la primera compra y después sola, en cada
 * renovación: es la que fija el período vigente y deja constancia del cobro.
 */
@Injectable()
export class InvoicePaidHandler implements StripeEventHandler {
  readonly handles = 'invoice.paid';

  constructor(private readonly subscriptions: SubscriptionService) {}

  async handle(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId = subscriptionIdFromInvoice(invoice);

    if (!stripeSubscriptionId) return;

    const linea = invoice.lines?.data?.[0];

    await this.subscriptions.renewFromStripe({
      stripeSubscriptionId,
      periodStart: this.aFecha(linea?.period?.start, invoice.created),
      periodEnd: this.aFecha(linea?.period?.end, invoice.created),
      // Stripe expresa los importes en la unidad mínima de la moneda.
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: (invoice.currency ?? 'usd').toUpperCase(),
      invoiceId: invoice.id,
    });
  }

  private aFecha(segundos: number | undefined, respaldo: number): Date {
    return new Date((segundos ?? respaldo) * 1000);
  }
}
