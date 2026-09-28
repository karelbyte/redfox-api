import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2026-02-25.clover',
      });
    }
  }

  async createCustomer(email: string, name: string) {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays: number = 7,
  ) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * La moneda es obligatoria y va delante del método de pago: cuando tenía
   * valor por defecto y viajaba al final, quien llamaba la omitía sin darse
   * cuenta y un plan en otra moneda terminaba cobrándose en pesos mexicanos.
   * El importe debe ser el mismo que se le mostró al usuario, ya en la moneda
   * en la que se le va a cobrar; aquí no se convierte nada.
   */
  /**
   * Resuelve el precio de Stripe a partir del nombre estable que guardamos en
   * el plan. Se busca por nombre y no por identificador porque el precio se
   * puede borrar y recrear en el dashboard: el identificador cambiaría y la
   * base quedaría apuntando al vacío, mientras que el nombre se reasigna.
   */
  async findPriceByLookupKey(lookupKey: string): Promise<Stripe.Price> {
    const prices = await this.stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });

    const price = prices.data[0];
    if (!price) {
      throw new Error(
        `No existe un precio activo en Stripe con lookup_key '${lookupKey}'`,
      );
    }

    return price;
  }

  /**
   * Abre una sesión de pago alojada por Stripe. El cliente es obligatorio: sin
   * él Stripe crearía uno nuevo en cada compra y la suscripción quedaría
   * colgando de un cliente anónimo, imposible de asociar a la organización.
   *
   * `clientReferenceId` viaja de vuelta en checkout.session.completed y es lo
   * que permite reconocer de quién era la compra al recibir el webhook.
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    clientReferenceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
  }): Promise<Stripe.Checkout.Session> {
    const data: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      customer: params.customerId,
      client_reference_id: params.clientReferenceId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      billing_address_collection: 'auto',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };

    // Solo se pide prueba si quien llama determinó que aún le corresponde:
    // pasarla siempre le regalaría otro período a quien ya la agotó.
    if (params.trialDays && params.trialDays > 0) {
      data.subscription_data = { trial_period_days: params.trialDays };
    }

    return this.stripe.checkout.sessions.create(data);
  }

  /**
   * Abre el portal donde el cliente gestiona su propia suscripción: cambiar
   * tarjeta, ver facturas, cancelar.
   *
   * El cliente debe venir siempre de la organización autenticada. Si se
   * tomara de la petición, cualquiera que adivinara un identificador ajeno
   * entraría a la facturación de otra organización.
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async createPaymentIntent(
    customerId: string,
    amount: number,
    currency: string,
    paymentMethodId?: string,
  ) {
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      customer: customerId,
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      confirmation_method: 'automatic',
      confirm: false,
    };

    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
    }

    return this.stripe.paymentIntents.create(paymentIntentData);
  }

  constructWebhookEvent(body: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }
    return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }
}
