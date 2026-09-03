/**
 * Pure mapping from a Stripe event to the action our domain must take.
 * Kept free of any I/O so it can be unit-tested with plain event objects.
 *
 * We key everything on the Checkout Session id (stored at link creation) so the
 * webhook handler stays idempotent and independent of the PaymentIntent.
 */

export interface StripeSessionLike {
  id?: string;
  payment_status?: string | null;
  payment_intent?: string | { id?: string } | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
}

export interface StripeEventLike {
  type?: string;
  data?: { object?: StripeSessionLike };
}

export type StripeEventOutcome =
  | { kind: 'paid'; sessionId: string; paymentIntentId: string | null; customerEmail: string | null }
  | { kind: 'failed'; sessionId: string }
  | { kind: 'expired'; sessionId: string }
  | { kind: 'ignored' };

function extractPaymentIntentId(session: StripeSessionLike): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  if (typeof pi === 'string') return pi;
  return pi.id ?? null;
}

function extractEmail(session: StripeSessionLike): string | null {
  return session.customer_details?.email ?? session.customer_email ?? null;
}

export function interpretStripeEvent(event: StripeEventLike): StripeEventOutcome {
  const session = event.data?.object;
  const sessionId = session?.id;
  if (!session || !sessionId) return { kind: 'ignored' };

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      // 'unpaid' arrive sur les moyens de paiement différés → on attend l'event async.
      if (session.payment_status !== 'paid') return { kind: 'ignored' };
      return {
        kind: 'paid',
        sessionId,
        paymentIntentId: extractPaymentIntentId(session),
        customerEmail: extractEmail(session),
      };
    case 'checkout.session.async_payment_failed':
      return { kind: 'failed', sessionId };
    case 'checkout.session.expired':
      return { kind: 'expired', sessionId };
    default:
      return { kind: 'ignored' };
  }
}
