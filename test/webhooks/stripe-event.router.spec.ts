import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Stripe from 'stripe';

import { StripeEventRouter } from '../../src/webhooks/stripe-event.router';
import {
  STRIPE_EVENT_HANDLERS,
  StripeEventHandler,
} from '../../src/webhooks/stripe-event-handler.interface';
import { StripeProcessedEvent } from '../../src/models/stripe-processed-event.entity';

describe('StripeEventRouter', () => {
  let router: StripeEventRouter;
  let processedRepository: jest.Mocked<any>;
  let manejadorFacturaPagada: jest.Mocked<StripeEventHandler>;
  let manejadorCancelacion: jest.Mocked<StripeEventHandler>;

  const evento = (type: string, id = 'evt_1'): Stripe.Event =>
    ({ id, type, data: { object: {} } }) as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    processedRepository = {
      count: jest.fn().mockResolvedValue(0),
      insert: jest.fn().mockResolvedValue(undefined),
    };

    manejadorFacturaPagada = {
      handles: 'invoice.paid',
      handle: jest.fn().mockResolvedValue(undefined),
    };

    manejadorCancelacion = {
      handles: 'customer.subscription.deleted',
      handle: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeEventRouter,
        {
          provide: STRIPE_EVENT_HANDLERS,
          useValue: [manejadorFacturaPagada, manejadorCancelacion],
        },
        {
          provide: getRepositoryToken(StripeProcessedEvent),
          useValue: processedRepository,
        },
      ],
    }).compile();

    router = module.get<StripeEventRouter>(StripeEventRouter);
  });

  it('entrega el evento al manejador que lo declara', async () => {
    await router.route(evento('invoice.paid'));

    expect(manejadorFacturaPagada.handle).toHaveBeenCalledTimes(1);
    expect(manejadorCancelacion.handle).not.toHaveBeenCalled();
  });

  it('descarta una segunda entrega del mismo evento', async () => {
    // Stripe reintenta hasta recibir un 2xx: sin esta guarda, una renovación
    // extendería el período dos veces.
    processedRepository.count.mockResolvedValue(1);

    await router.route(evento('invoice.paid'));

    expect(manejadorFacturaPagada.handle).not.toHaveBeenCalled();
  });

  it('ignora sin fallar un evento que nadie atiende', async () => {
    await expect(
      router.route(evento('customer.source.expiring')),
    ).resolves.toBeUndefined();

    expect(manejadorFacturaPagada.handle).not.toHaveBeenCalled();
    expect(manejadorCancelacion.handle).not.toHaveBeenCalled();
  });

  it('no marca como atendido un evento que falló', async () => {
    // Marcarlo antes de tiempo convertiría un fallo transitorio en una
    // pérdida definitiva: el reintento de Stripe lo encontraría ya visto.
    manejadorFacturaPagada.handle.mockRejectedValue(new Error('base caída'));

    await expect(router.route(evento('invoice.paid'))).rejects.toThrow(
      'base caída',
    );
    expect(processedRepository.insert).not.toHaveBeenCalled();
  });

  it('registra el evento una vez atendido', async () => {
    await router.route(evento('invoice.paid', 'evt_99'));

    expect(processedRepository.insert).toHaveBeenCalledWith({
      event_id: 'evt_99',
      event_type: 'invoice.paid',
    });
  });

  it('tolera que dos entregas simultáneas choquen al registrarse', async () => {
    processedRepository.insert.mockRejectedValue(new Error('duplicate key'));

    await expect(router.route(evento('invoice.paid'))).resolves.toBeUndefined();
    expect(manejadorFacturaPagada.handle).toHaveBeenCalledTimes(1);
  });
});
