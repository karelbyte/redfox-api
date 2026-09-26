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
import { StripeEventRouter } from '../webhooks/stripe-event.router';
import { Public } from '../decorators/public.decorator';

@Controller('stripe-webhooks')
export class StripeWebhookController {
  constructor(
    private stripeService: StripeService,
    private stripeEventRouter: StripeEventRouter,
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
      await this.stripeEventRouter.route(event);
      return { received: true };
    } catch (err) {
      console.error(`❌ Webhook Error: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
