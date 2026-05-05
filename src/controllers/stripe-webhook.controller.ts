import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../services/stripe.service';
import { SubscriptionService } from '../services/subscription.service';
import { Public } from '../decorators/public.decorator';

@Controller('stripe-webhooks')
export class StripeWebhookController {
  constructor(
    private stripeService: StripeService,
    private subscriptionService: SubscriptionService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
      );
      await this.subscriptionService.handleStripeEvent(event);
      return { received: true };
    } catch (err) {
      console.error(`❌ Webhook Error: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
