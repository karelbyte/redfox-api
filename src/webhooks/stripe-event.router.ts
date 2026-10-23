import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { StripeProcessedEvent } from '../models/stripe-processed-event.entity';
import {
  STRIPE_EVENT_HANDLERS,
  StripeEventHandler,
} from './stripe-event-handler.interface';

/**
 * Entrega cada evento de Stripe a quien sabe atenderlo.
 *
 * Reemplaza al switch que tenía la lógica de los cuatro eventos en un solo
 * método: aquí el enrutador no conoce ningún evento en concreto, así que
 * sumar uno nuevo es registrar una clase más y no editar este archivo.
 */
@Injectable()
export class StripeEventRouter {
  private readonly logger = new Logger(StripeEventRouter.name);
  private readonly byType: Map<string, StripeEventHandler>;

  constructor(
    @Inject(STRIPE_EVENT_HANDLERS) handlers: StripeEventHandler[],
    @InjectRepository(StripeProcessedEvent)
    private readonly processedRepository: Repository<StripeProcessedEvent>,
  ) {
    this.byType = new Map(handlers.map((handler) => [handler.handles, handler]));
  }

  async route(event: Stripe.Event): Promise<void> {
    if (await this.alreadyHandled(event.id)) {
      this.logger.log(`Evento repetido, se descarta: ${event.id}`);
      return;
    }

    const handler = this.byType.get(event.type);
    if (!handler) {
      // Stripe envía tipos que no pedimos; ignorarlos no es un error.
      this.logger.debug(`Sin manejador para ${event.type}`);
      return;
    }

    await handler.handle(event);
    await this.markHandled(event);
  }

  private async alreadyHandled(eventId: string): Promise<boolean> {
    const count = await this.processedRepository.count({
      where: { event_id: eventId },
    });

    return count > 0;
  }

  /**
   * Se marca después de atender, no antes: si el manejador falla a mitad de
   * camino, el evento queda sin marcar y el reintento de Stripe vuelve a
   * pasar por aquí. Marcarlo antes convertiría un fallo en una pérdida.
   */
  private async markHandled(event: Stripe.Event): Promise<void> {
    try {
      await this.processedRepository.insert({
        event_id: event.id,
        event_type: event.type,
      });
    } catch (error) {
      // Dos entregas simultáneas del mismo evento chocan contra la unicidad.
      // El trabajo ya está hecho, así que no hay nada que corregir.
      this.logger.debug(`Evento ya registrado: ${event.id}`);
    }
  }
}
