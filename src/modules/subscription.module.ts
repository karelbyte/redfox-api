import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { SubscriptionPayment } from '../models/subscription-payment.entity';
import { BillingCheckoutService } from '../services/billing-checkout.service';
import { StripeProcessedEvent } from '../models/stripe-processed-event.entity';
import { StripeEventRouter } from '../webhooks/stripe-event.router';
import { STRIPE_EVENT_HANDLERS } from '../webhooks/stripe-event-handler.interface';
import { CheckoutSessionCompletedHandler } from '../webhooks/handlers/checkout-session-completed.handler';
import { InvoicePaidHandler } from '../webhooks/handlers/invoice-paid.handler';
import { InvoicePaymentFailedHandler } from '../webhooks/handlers/invoice-payment-failed.handler';
import { SubscriptionDeletedHandler } from '../webhooks/handlers/subscription-deleted.handler';
import { SubscriptionUpdatedHandler } from '../webhooks/handlers/subscription-updated.handler';
import { Organization } from '../models/organization.entity';
import { User } from '../models/user.entity';
import { SubscriptionService } from '../services/subscription.service';
import { StripeService } from '../services/stripe.service';
import { SubscriptionSchedulerService } from '../services/subscription-scheduler.service';
import { SubscriptionEmailService } from '../services/subscription-email.service';
import { SubscriptionReceiptPdfService } from '../services/subscription-receipt-pdf.service';
import { SubscriptionController } from '../controllers/subscription.controller';
import { PublicPlansController } from '../controllers/public-plans.controller';
import { StripeWebhookController } from '../controllers/stripe-webhook.controller';
import stripeConfig from '../config/stripe.config';
import { ReferralModule } from './referral.module';
import { LanguageModule } from './language.module';
import { OrganizationModule } from './organization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Plan,
      SubscriptionPayment,
      Organization,
      User,
      StripeProcessedEvent,
    ]),
    ConfigModule.forFeature(stripeConfig),
    ThrottlerModule.forRoot([{ ttl: 600000, limit: 3 }]),
    forwardRef(() => ReferralModule),
    LanguageModule,
    OrganizationModule,
  ],
  controllers: [
    SubscriptionController,
    PublicPlansController,
    StripeWebhookController,
  ],
  providers: [
    SubscriptionService,
    BillingCheckoutService,
    StripeEventRouter,
    CheckoutSessionCompletedHandler,
    InvoicePaidHandler,
    InvoicePaymentFailedHandler,
    SubscriptionDeletedHandler,
    SubscriptionUpdatedHandler,
    {
      // El enrutador recibe la lista completa y arma su tabla de despacho.
      // Sumar un evento es agregar su clase aquí, sin tocar el enrutador.
      provide: STRIPE_EVENT_HANDLERS,
      useFactory: (...handlers) => handlers,
      inject: [
        CheckoutSessionCompletedHandler,
        InvoicePaidHandler,
        InvoicePaymentFailedHandler,
        SubscriptionDeletedHandler,
        SubscriptionUpdatedHandler,
      ],
    },
    StripeService,
    SubscriptionSchedulerService,
    SubscriptionEmailService,
    SubscriptionReceiptPdfService,
  ],
  exports: [SubscriptionService, StripeService],
})
export class SubscriptionModule {}
