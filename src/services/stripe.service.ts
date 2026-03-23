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

  async createPaymentIntent(
    customerId: string,
    amount: number,
    paymentMethodId?: string,
    currency: string = 'mxn',
  ) {
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      customer: customerId,
      amount: Math.round(amount * 100),
      currency,
      // confirmation_method manual allows the frontend to confirm via confirmCardPayment
      confirmation_method: 'manual',
      confirm: false,
    };

    if (paymentMethodId) {
      paymentIntentData.payment_method = paymentMethodId;
    }

    return this.stripe.paymentIntents.create(paymentIntentData);
  }

  constructWebhookEvent(body: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }
    return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
  }
}
