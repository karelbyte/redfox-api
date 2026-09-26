import Stripe from 'stripe';

/**
 * Atiende un tipo de evento de Stripe. Una clase por evento: cada una tiene
 * una sola razón para cambiar, y agregar un evento nuevo no obliga a tocar
 * los que ya funcionan.
 */
export interface StripeEventHandler {
  /** Tipo de evento de Stripe que esta clase atiende. */
  readonly handles: string;

  handle(event: Stripe.Event): Promise<void>;
}

/** Token de inyección con el que el enrutador recibe todos los manejadores. */
export const STRIPE_EVENT_HANDLERS = 'STRIPE_EVENT_HANDLERS';
