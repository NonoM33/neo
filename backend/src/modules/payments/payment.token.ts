/**
 * HMAC-signed tokens for the public payment link (`/payer/:token`).
 *
 * The token payload is `<paymentId>.<expiry>` and signed with JWT_SECRET.
 * The signature is base64url-encoded to keep the token URL-safe and short.
 *
 * Format: `<paymentId>.<expiry>.<sig>`
 *
 * No DB lookup is needed to validate — verify HMAC + check expiry, then
 * load the payment by id. Mirrors the order-tracking token scheme.
 */

import { env } from '../../config/env';

const SECRET = env.JWT_SECRET;

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function hmacBase64Url(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return base64url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signPaymentToken(
  paymentId: string,
  ttlDays: number
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = `${paymentId}.${expiry}`;
  const sig = await hmacBase64Url(payload);
  return `${payload}.${sig}`;
}

export interface VerifiedPaymentToken {
  paymentId: string;
  expiry: number;
}

export async function verifyPaymentToken(
  token: string
): Promise<VerifiedPaymentToken | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [paymentId, expiryStr, sig] = parts;
  if (!paymentId || !expiryStr || !sig) return null;

  const expected = await hmacBase64Url(`${paymentId}.${expiryStr}`);
  if (!timingSafeEqual(expected, sig)) return null;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry)) return null;
  if (Date.now() / 1000 > expiry) return null;

  return { paymentId, expiry };
}
