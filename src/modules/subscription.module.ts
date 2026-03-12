import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Subscription } from '../models/subscription.entity';
import { Plan } from '../models/plan.entity';
import { SubscriptionPayment } from '../models/subscription-payment.entity';
import { Organization } from '../models/organization.entity';
import { SubscriptionService } from '../services/subscription.service';
import { StripeService } from '../services/stripe.service';
import { SubscriptionSchedulerService } from '../services/subscription-scheduler.service';
import { SubscriptionController } from '../controllers/subscription.controller';
import stripeConfig from '../config/stripe.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Plan,
      SubscriptionPayment,
      Organization,
    ]),
    ConfigModule.forFeature(stripeConfig),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    StripeService,
    SubscriptionSchedulerService,
  ],
  exports: [SubscriptionService, StripeService],
})
export class SubscriptionModule {}
