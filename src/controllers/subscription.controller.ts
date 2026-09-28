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
import { BillingCheckoutService } from '../services/billing-checkout.service';
import { AuthGuard } from '../guards/auth.guard';
import { Public } from '../decorators/public.decorator';
import { ConvertTrialDto } from '../dtos/subscription/convert-trial.dto';
import { CreatePlanDto } from '../dtos/subscription/create-plan.dto';
import { TranslationService } from '../services/translation.service';
import { TenantContext } from '../services/tenant-context.service';
import { OrganizationService } from '../services/organization.service';

@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(
    private subscriptionService: SubscriptionService,
    private billingCheckoutService: BillingCheckoutService,
    private translationService: TranslationService,
    private tenantContext: TenantContext,
    private organizationService: OrganizationService,
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

  /**
   * Devuelve la URL de la pantalla de pago alojada por Stripe. El front no
   * recibe ningún dato de tarjeta: solo redirige a esta URL.
   */
  @Post('checkout-session')
  async createCheckoutSession(
    @Req() request: any,
    @Body() body: { planId?: string },
  ) {
    const { organizationId, tenantSlug } = await this.resolveTenant(request);

    return this.billingCheckoutService.startCheckout(
      organizationId,
      tenantSlug,
      body?.planId,
    );
  }

  /**
   * Devuelve la URL del portal de Stripe donde la organización cambia su
   * tarjeta, consulta sus facturas o cancela. Deliberadamente no acepta
   * ningún identificador de cliente: sale del usuario autenticado.
   */
  @Post('portal-session')
  async createPortalSession(@Req() request: any) {
    const { organizationId, tenantSlug } = await this.resolveTenant(request);

    return this.billingCheckoutService.openBillingPortal(
      organizationId,
      tenantSlug,
    );
  }

  private async resolveTenant(
    request: any,
  ): Promise<{ organizationId: string; tenantSlug: string }> {
    const organizationId =
      this.tenantContext.getOrganizationId() || request.user?.organizationId;

    if (!organizationId) {
      const message = await this.translationService.translate(
        'auth.organization_required',
        request.user?.id,
      );
      throw new BadRequestException(message);
    }

    const tenantSlug =
      this.tenantContext.getTenantSlug() ||
      (await this.organizationService.findOne(organizationId))?.slug;

    if (!tenantSlug) {
      throw new BadRequestException('No se pudo determinar la organización');
    }

    return { organizationId, tenantSlug };
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
  async getPlans(@Req() request: any) {
    const organizationId = this.tenantContext.getOrganizationId();
    
    let organizationReferrerCode: string | undefined = undefined;
    let organizationCountry: string | null = null;

    if (organizationId) {
      const organization = await this.organizationService.findOne(organizationId);
      organizationReferrerCode = organization?.referrer_code || undefined;
      organizationCountry = organization?.country ?? null;
    } else if (request.user) {
      if (request.user.organizationId && !request.user.organization) {
        const organization = await this.organizationService.findOne(request.user.organizationId);
        organizationReferrerCode = organization?.referrer_code || undefined;
        organizationCountry = organization?.country ?? null;
      } else if (request.user.organization) {
        organizationReferrerCode = request.user.organization.referrer_code || undefined;
        organizationCountry = request.user.organization.country ?? null;
      }
    }

    // El país decide en qué moneda se le ofrecen los planes
    const plans = await this.subscriptionService.getAllPlans(
      organizationReferrerCode,
      organizationCountry,
    );
    
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      billing_period: p.billing_period,
      description: p.description,
      features: p.features,
      is_default: p.is_default,
    }));
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
