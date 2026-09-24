import { describe, expect, it } from 'bun:test';
import { signPaymentToken, verifyPaymentToken } from './payment.token';

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';

describe('payment token', () => {
  it('signs then verifies a round-trip token', async () => {
    const token = await signPaymentToken(PAYMENT_ID, 30);
    const verified = await verifyPaymentToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.paymentId).toBe(PAYMENT_ID);
  });

  it('produces a URL-safe token (no +, /, or =)', async () => {
    const token = await signPaymentToken(PAYMENT_ID, 30);
    expect(token).not.toMatch(/[+/=]/);
  });

  it('rejects a tampered payment id', async () => {
    const token = await signPaymentToken(PAYMENT_ID, 30);
    const [, expiry, sig] = token.split('.');
    const forged = `22222222-2222-4222-8222-222222222222.${expiry}.${sig}`;
    expect(await verifyPaymentToken(forged)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const token = await signPaymentToken(PAYMENT_ID, 30);
    const [id, expiry] = token.split('.');
    expect(await verifyPaymentToken(`${id}.${expiry}.deadbeef`)).toBeNull();
  });

  it('rejects a malformed token', async () => {
    expect(await verifyPaymentToken('not-a-token')).toBeNull();
    expect(await verifyPaymentToken('a.b')).toBeNull();
    expect(await verifyPaymentToken('')).toBeNull();
  });

  it('rejects an expired token', async () => {
    // TTL of 0 day → expiry = now; advance past it is hard, so sign a negative TTL.
    const token = await signPaymentToken(PAYMENT_ID, -1);
    expect(await verifyPaymentToken(token)).toBeNull();
  });
});
