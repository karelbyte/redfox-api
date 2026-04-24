import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { AuthGuard } from '../guards/auth.guard';
import { Public } from '../decorators/public.decorator';
import { ConvertTrialDto } from '../dtos/subscription/convert-trial.dto';
import { CreatePlanDto } from '../dtos/subscription/create-plan.dto';
import { TranslationService } from '../services/translation.service';

@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private translationService: TranslationService,
  ) {}

  @Get('status')
  async getSubscriptionStatus(@Req() request: any) {
    const organizationId = request.user?.organizationId;
    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        request.user?.id,
      );
      throw new BadRequestException(message);
    }
    return this.subscriptionService.getSubscriptionStatus(organizationId);
  }

  @Post('convert-trial')
  async convertTrial(
    @Req() request: any,
    @Body() convertTrialDto: ConvertTrialDto,
  ) {
    const organizationId = request.user?.organizationId;
    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        request.user?.id,
      );
      throw new BadRequestException(message);
    }
    return this.subscriptionService.convertTrialToSubscription(
      organizationId,
      convertTrialDto.paymentMethodId,
      convertTrialDto.planId,
    );
  }

  @Post('confirm-payment/:subscriptionId')
  async confirmPayment(
    @Req() request: any,
    @Body() body: { subscriptionId: string },
  ) {
    return this.subscriptionService.confirmSubscriptionPayment(
      body.subscriptionId,
    );
  }

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @Get('plans/admin')
  async getPlansAdmin() {
    return this.subscriptionService.getAllPlansAdmin();
  }

  @Post('plans')
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    return this.subscriptionService.createPlan(createPlanDto);
  }

  @Put('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() data: Partial<CreatePlanDto>,
  ) {
    return this.subscriptionService.updatePlan(id, data);
  }
}
