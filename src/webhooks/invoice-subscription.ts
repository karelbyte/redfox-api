import Stripe from 'stripe';

/**
 * Saca de una factura la suscripción a la que pertenece.
 *
 * Stripe movió ese dato: hasta cierta versión de la API venía en la raíz como
 * `invoice.subscription`, y en las actuales vive en
 * `invoice.parent.subscription_details.subscription`. Se miran los dos sitios
 * porque una cuenta puede recibir eventos generados con la versión con la que
 * fueron creados, y porque el día que se suba la versión del SDK esto no debe
 * romperse en silencio: leer el campo que ya no existe no da error, devuelve
 * indefinido, y la renovación se pierde sin dejar rastro.
 */
export function subscriptionIdFromInvoice(
  invoice: Stripe.Invoice,
): string | null {
  const raiz = (invoice as unknown as { subscription?: string | null })
    .subscription;
  if (typeof raiz === 'string' && raiz) return raiz;

  const parent = (
    invoice as unknown as {
      parent?: {
        subscription_details?: { subscription?: string | Stripe.Subscription };
      };
    }
  ).parent;

  const anidada = parent?.subscription_details?.subscription;
  if (typeof anidada === 'string' && anidada) return anidada;
  if (anidada && typeof anidada === 'object' && anidada.id) return anidada.id;

  return null;
}
