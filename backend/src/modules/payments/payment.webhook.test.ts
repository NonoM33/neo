import { describe, expect, it } from 'bun:test';
import { interpretStripeEvent } from './payment.webhook';

describe('interpretStripeEvent', () => {
  it('maps a paid checkout session to a paid outcome', () => {
    const outcome = interpretStripeEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          payment_status: 'paid',
          payment_intent: 'pi_456',
          customer_details: { email: 'client@example.com' },
        },
      },
    });
    expect(outcome).toEqual({
      kind: 'paid',
      sessionId: 'cs_123',
      paymentIntentId: 'pi_456',
      customerEmail: 'client@example.com',
    });
  });

  it('extracts the payment intent id from an expanded object', () => {
    const outcome = interpretStripeEvent({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', payment_status: 'paid', payment_intent: { id: 'pi_exp' } } },
    });
    expect(outcome).toMatchObject({ kind: 'paid', paymentIntentId: 'pi_exp' });
  });

  it('ignores a completed-but-unpaid session (deferred payment)', () => {
    const outcome = interpretStripeEvent({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_1', payment_status: 'unpaid' } },
    });
    expect(outcome).toEqual({ kind: 'ignored' });
  });

  it('maps async_payment_succeeded (paid) to paid', () => {
    const outcome = interpretStripeEvent({
      type: 'checkout.session.async_payment_succeeded',
      data: { object: { id: 'cs_async', payment_status: 'paid', payment_intent: 'pi_a' } },
    });
    expect(outcome).toMatchObject({ kind: 'paid', sessionId: 'cs_async' });
  });

  it('maps async_payment_failed to failed', () => {
    const outcome = interpretStripeEvent({
      type: 'checkout.session.async_payment_failed',
      data: { object: { id: 'cs_f' } },
    });
    expect(outcome).toEqual({ kind: 'failed', sessionId: 'cs_f' });
  });

  it('maps an expired session to expired', () => {
    const outcome = interpretStripeEvent({
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_e' } },
    });
    expect(outcome).toEqual({ kind: 'expired', sessionId: 'cs_e' });
  });

  it('ignores unrelated events', () => {
    expect(interpretStripeEvent({ type: 'payment_intent.created', data: { object: { id: 'x' } } })).toEqual({
      kind: 'ignored',
    });
  });

  it('ignores an event with no session object', () => {
    expect(interpretStripeEvent({ type: 'checkout.session.completed', data: {} })).toEqual({
      kind: 'ignored',
    });
  });
});
