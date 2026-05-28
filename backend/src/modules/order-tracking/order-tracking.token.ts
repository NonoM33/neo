/**
 * HMAC-signed tokens for the public order tracking page.
 *
 * The token payload is `<orderId>.<expiry>` and signed with
 * COMPANY_TRACKING_SECRET (falling back to JWT_SECRET). The signature is
 * base64url-encoded to keep the token URL-safe and short.
 *
 * Format: `<orderId>.<expiry>.<sig>`  (e.g. abc-def…2099.AbCdEf…)
 *
 * No DB lookup is needed to validate — verify HMAC + check expiry, then
 * load the order by id.
 */

import { env } from '../../config/env';

const SECRET = env.JWT_SECRET;
const DEFAULT_TTL_DAYS = 60;

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin)
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function hmacBase64Url(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
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

export async function signOrderTrackingToken(
  orderId: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = `${orderId}.${expiry}`;
  const sig = await hmacBase64Url(payload);
  return `${payload}.${sig}`;
}

export interface VerifiedOrderToken {
  orderId: string;
  expiry: number;
}

export async function verifyOrderTrackingToken(
  token: string,
): Promise<VerifiedOrderToken | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [orderId, expiryStr, sig] = parts;
  if (!orderId || !expiryStr || !sig) return null;

  const expected = await hmacBase64Url(`${orderId}.${expiryStr}`);
  if (!timingSafeEqual(expected, sig)) return null;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry)) return null;
  if (Date.now() / 1000 > expiry) return null;

  return { orderId, expiry };
}
