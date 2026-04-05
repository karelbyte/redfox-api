import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { SubscriptionPayment } from '../models/subscription-payment.entity';
import { Organization } from '../models/organization.entity';
import { User } from '../models/user.entity';
import { SubscriptionService } from '../services/subscription.service';
import { StripeService } from '../services/stripe.service';
import { SubscriptionSchedulerService } from '../services/subscription-scheduler.service';
import { SubscriptionEmailService } from '../services/subscription-email.service';
import { SubscriptionReceiptPdfService } from '../services/subscription-receipt-pdf.service';
import { SubscriptionController } from '../controllers/subscription.controller';
import { PublicPlansController } from '../controllers/public-plans.controller';
import stripeConfig from '../config/stripe.config';
import { ReferralModule } from './referral.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Plan,
      SubscriptionPayment,
      Organization,
      User,
    ]),
    ConfigModule.forFeature(stripeConfig),
    ThrottlerModule.forRoot([{ ttl: 600000, limit: 3 }]),
    forwardRef(() => ReferralModule),
  ],
  controllers: [SubscriptionController, PublicPlansController],
  providers: [
    SubscriptionService,
    StripeService,
    SubscriptionSchedulerService,
    SubscriptionEmailService,
    SubscriptionReceiptPdfService,
  ],
  exports: [SubscriptionService, StripeService],
})
export class SubscriptionModule {}
