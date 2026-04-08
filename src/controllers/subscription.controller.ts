import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { AuthGuard } from '../guards/auth.guard';
import { Public } from '../decorators/public.decorator';
import { ConvertTrialDto } from '../dtos/subscription/convert-trial.dto';
import { CreatePlanDto } from '../dtos/subscription/create-plan.dto';

@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('status')
  async getSubscriptionStatus(@Req() request: any) {
    const organizationId = request.user?.organizationId;
    if (!organizationId) {
      throw new Error('Organization ID not found');
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
      throw new Error('Organization ID not found');
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
    // Solo planes públicos — para el front del cliente
    return this.subscriptionService.getAllPlans();
  }

  @Get('plans/admin')
  async getPlansAdmin() {
    // Todos los planes incluyendo privados — para el panel de administración
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
