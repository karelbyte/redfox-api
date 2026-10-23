import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';

import { BillingCheckoutService } from '../../src/services/billing-checkout.service';
import { StripeService } from '../../src/services/stripe.service';
import { Organization } from '../../src/models/organization.entity';
import { Plan } from '../../src/models/plan.entity';
import { Subscription } from '../../src/models/subscription.entity';
import { User } from '../../src/models/user.entity';

describe('BillingCheckoutService', () => {
  let service: BillingCheckoutService;
  let subscriptionRepository: jest.Mocked<any>;
  let planRepository: jest.Mocked<any>;
  let organizationRepository: jest.Mocked<any>;
  let userRepository: jest.Mocked<any>;
  let stripeService: jest.Mocked<any>;

  const mexicanPlan = {
    id: 'plan-mx',
    name: 'Plan Mensual',
    currency: 'MXN',
    country: 'MX',
    stripe_lookup_key: 'nitro_mx_monthly',
    is_default: true,
    is_active: true,
  } as any;

  const peruvianPlan = {
    id: 'plan-pe',
    name: 'Plan Mensual',
    currency: 'USD',
    country: 'PE',
    stripe_lookup_key: 'nitro_pe_monthly',
    is_default: true,
    is_active: true,
  } as any;

  const activeSubscription = {
    id: 'sub-1',
    organization_id: 'org-1',
    plan_id: 'plan-pe',
    stripe_customer_id: 'cus_existente',
    trial_end_date: null,
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    subscriptionRepository = { findOne: jest.fn(), update: jest.fn() };
    planRepository = { find: jest.fn(), findOne: jest.fn() };
    organizationRepository = { findOne: jest.fn() };
    userRepository = { findOne: jest.fn() };

    stripeService = {
      findPriceByLookupKey: jest.fn(),
      createCheckoutSession: jest.fn(),
      createBillingPortalSession: jest.fn(),
      createCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingCheckoutService,
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepository },
        { provide: getRepositoryToken(Plan), useValue: planRepository },
        { provide: getRepositoryToken(Organization), useValue: organizationRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: StripeService, useValue: stripeService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('https://app.nitro.test') },
        },
      ],
    }).compile();

    service = module.get<BillingCheckoutService>(BillingCheckoutService);
  });

  describe('startCheckout', () => {
    beforeEach(() => {
      subscriptionRepository.findOne.mockResolvedValue(activeSubscription);
      stripeService.findPriceByLookupKey.mockResolvedValue({ id: 'price_123' });
      stripeService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/c/pay/abc',
      });
    });

    it('cobra el plan del país de la organización', async () => {
      organizationRepository.findOne.mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        country: 'PE',
      });
      planRepository.find.mockResolvedValue([peruvianPlan]);

      await service.startCheckout('org-1', 'acme');

      expect(stripeService.findPriceByLookupKey).toHaveBeenCalledWith(
        'nitro_pe_monthly',
      );
    });

    it('cobra el plan mexicano cuando la organización es de México', async () => {
      organizationRepository.findOne.mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        country: 'MX',
      });
      planRepository.find.mockResolvedValue([mexicanPlan]);

      await service.startCheckout('org-1', 'acme');

      expect(stripeService.findPriceByLookupKey).toHaveBeenCalledWith(
        'nitro_mx_monthly',
      );
    });

    it('no pide período de prueba si la organización ya lo agotó', async () => {
      organizationRepository.findOne.mockResolvedValue({ country: 'PE' });
      planRepository.find.mockResolvedValue([peruvianPlan]);
      subscriptionRepository.findOne.mockResolvedValue({
        ...activeSubscription,
        trial_end_date: new Date('2020-01-01'),
      });

      await service.startCheckout('org-1', 'acme');

      const args = stripeService.createCheckoutSession.mock.calls[0][0];
      expect(args.trialDays).toBe(0);
    });

    it('rechaza un plan sin precio configurado en Stripe', async () => {
      organizationRepository.findOne.mockResolvedValue({ country: 'PE' });
      planRepository.find.mockResolvedValue([
        { ...peruvianPlan, stripe_lookup_key: null },
      ]);

      await expect(service.startCheckout('org-1', 'acme')).rejects.toThrow(
        BadRequestException,
      );
      expect(stripeService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('identifica la organización para poder reconocerla en el webhook', async () => {
      organizationRepository.findOne.mockResolvedValue({ country: 'PE' });
      planRepository.find.mockResolvedValue([peruvianPlan]);

      await service.startCheckout('org-1', 'acme');

      const args = stripeService.createCheckoutSession.mock.calls[0][0];
      expect(args.clientReferenceId).toBe('org-1');
      expect(args.customerId).toBe('cus_existente');
    });
  });

  describe('openBillingPortal', () => {
    it('usa el cliente guardado en la suscripción de la organización', async () => {
      subscriptionRepository.findOne.mockResolvedValue(activeSubscription);
      stripeService.createBillingPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/p/session/xyz',
      });

      const result = await service.openBillingPortal('org-1', 'acme');

      // El identificador de cliente no se acepta desde fuera: si se pudiera
      // pasar en la petición, cualquiera abriría la facturación ajena.
      expect(stripeService.createBillingPortalSession).toHaveBeenCalledWith(
        'cus_existente',
        expect.stringContaining('/acme/'),
      );
      expect(result.url).toContain('billing.stripe.com');
    });

    it('falla si la organización todavía no tiene cliente de Stripe', async () => {
      subscriptionRepository.findOne.mockResolvedValue({
        ...activeSubscription,
        stripe_customer_id: null,
      });

      await expect(service.openBillingPortal('org-1', 'acme')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
