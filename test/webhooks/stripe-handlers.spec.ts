import Stripe from 'stripe';

import { CheckoutSessionCompletedHandler } from '../../src/webhooks/handlers/checkout-session-completed.handler';
import { InvoicePaidHandler } from '../../src/webhooks/handlers/invoice-paid.handler';
import { InvoicePaymentFailedHandler } from '../../src/webhooks/handlers/invoice-payment-failed.handler';
import { SubscriptionDeletedHandler } from '../../src/webhooks/handlers/subscription-deleted.handler';
import { SubscriptionUpdatedHandler } from '../../src/webhooks/handlers/subscription-updated.handler';

const evento = (object: any): Stripe.Event =>
  ({ id: 'evt_1', type: 'x', data: { object } }) as any;

describe('Manejadores de eventos de Stripe', () => {
  let subscriptions: any;

  beforeEach(() => {
    subscriptions = {
      activateFromStripe: jest.fn(),
      renewFromStripe: jest.fn(),
      markPastDue: jest.fn(),
      cancelFromStripe: jest.fn(),
      syncFromStripe: jest.fn(),
    };
  });

  describe('checkout.session.completed', () => {
    let handler: CheckoutSessionCompletedHandler;

    beforeEach(() => {
      handler = new CheckoutSessionCompletedHandler(subscriptions);
    });

    it('activa la organización que identifica client_reference_id', async () => {
      await handler.handle(
        evento({
          id: 'cs_1',
          mode: 'subscription',
          client_reference_id: 'org-1',
          subscription: 'sub_stripe_1',
        }),
      );

      expect(subscriptions.activateFromStripe).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          stripeSubscriptionId: 'sub_stripe_1',
        }),
      );
    });

    it('ignora una sesión que no es de suscripción', async () => {
      await handler.handle(
        evento({ id: 'cs_2', mode: 'payment', client_reference_id: 'org-1' }),
      );

      expect(subscriptions.activateFromStripe).not.toHaveBeenCalled();
    });

    it('no activa nada si la sesión llega sin organización', async () => {
      await handler.handle(
        evento({
          id: 'cs_3',
          mode: 'subscription',
          client_reference_id: null,
          subscription: 'sub_stripe_1',
        }),
      );

      expect(subscriptions.activateFromStripe).not.toHaveBeenCalled();
    });
  });

  describe('invoice.paid', () => {
    let handler: InvoicePaidHandler;

    beforeEach(() => {
      handler = new InvoicePaidHandler(subscriptions);
    });

    it('convierte el importe de la unidad mínima y toma el período de la línea', async () => {
      await handler.handle(
        evento({
          id: 'in_1',
          parent: {
            type: 'subscription_details',
            subscription_details: { subscription: 'sub_stripe_1' },
          },
          amount_paid: 4900,
          currency: 'usd',
          created: 1000,
          lines: { data: [{ period: { start: 1_700_000_000, end: 1_702_592_000 } }] },
        }),
      );

      expect(subscriptions.renewFromStripe).toHaveBeenCalledWith({
        stripeSubscriptionId: 'sub_stripe_1',
        periodStart: new Date(1_700_000_000 * 1000),
        periodEnd: new Date(1_702_592_000 * 1000),
        amount: 49,
        currency: 'USD',
        invoiceId: 'in_1',
      });
    });

    it('ignora una factura que no pertenece a una suscripción', async () => {
      await handler.handle(evento({ id: 'in_2', parent: null }));

      expect(subscriptions.renewFromStripe).not.toHaveBeenCalled();
    });

    /**
     * Stripe movió la suscripción de la raíz de la factura a parent. Leer solo
     * uno de los dos sitios hace que la renovación se pierda en silencio: el
     * campo ausente no da error, devuelve indefinido, y el manejador sale sin
     * hacer nada. Pasó de verdad en la primera prueba de pago.
     */
    it('encuentra la suscripción también en la forma antigua de la API', async () => {
      await handler.handle(
        evento({
          id: 'in_4',
          subscription: 'sub_stripe_viejo',
          amount_paid: 4900,
          currency: 'usd',
          created: 1000,
          lines: { data: [{ period: { start: 1, end: 2 } }] },
        }),
      );

      expect(subscriptions.renewFromStripe).toHaveBeenCalledWith(
        expect.objectContaining({ stripeSubscriptionId: 'sub_stripe_viejo' }),
      );
    });
  });

  describe('invoice.payment_failed', () => {
    it('deja la suscripción en mora sin cortar el acceso', async () => {
      const handler = new InvoicePaymentFailedHandler(subscriptions);

      await handler.handle(
        evento({
          id: 'in_3',
          parent: {
            type: 'subscription_details',
            subscription_details: { subscription: 'sub_stripe_1' },
          },
        }),
      );

      expect(subscriptions.markPastDue).toHaveBeenCalledWith('sub_stripe_1');
      expect(subscriptions.cancelFromStripe).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('cancela la suscripción', async () => {
      const handler = new SubscriptionDeletedHandler(subscriptions);

      await handler.handle(evento({ id: 'sub_stripe_1' }));

      expect(subscriptions.cancelFromStripe).toHaveBeenCalledWith(
        'sub_stripe_1',
      );
    });
  });

  describe('customer.subscription.updated', () => {
    it('refleja que el cliente desactivó la renovación desde el portal', async () => {
      const handler = new SubscriptionUpdatedHandler(subscriptions);

      await handler.handle(
        evento({
          id: 'sub_stripe_1',
          status: 'active',
          cancel_at_period_end: true,
          current_period_end: 1_702_592_000,
        }),
      );

      expect(subscriptions.syncFromStripe).toHaveBeenCalledWith({
        stripeSubscriptionId: 'sub_stripe_1',
        status: 'active',
        cancelAtPeriodEnd: true,
        periodEnd: new Date(1_702_592_000 * 1000),
      });
    });
  });
});
