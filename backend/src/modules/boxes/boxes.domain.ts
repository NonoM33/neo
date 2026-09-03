import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ValidationError } from '../../lib/errors';
import type { Box } from '../../db/schema/boxes';

// ----- Jeton de provisioning (celui du QR affiche par la box) -----
//
// Vingt caracteres en base32 Crockford, sans I, L, O, U. Crockford CORRIGE les
// glyphes confondables a la lecture (O -> 0, I et L -> 1) : un installateur qui
// recopie le code a la main n'est pas rejete pour un O tape a la place d'un 0.
// Le meme alphabet et les memes regles vivent cote box (neo-box, token.py).

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const TOKEN_LENGTH = 20;
export const QR_SCHEME = 'NEO:';

const CORRECTIONS: Record<string, string> = { O: '0', I: '1', L: '1' };

/** Normalise une saisie humaine ou un scan de QR en jeton canonique. */
export function normalizeProvisioningToken(raw: string): string {
  let cleaned = raw.trim().toUpperCase().replace(/[-\s]/g, '');
  if (cleaned.startsWith(QR_SCHEME)) {
    cleaned = cleaned.slice(QR_SCHEME.length);
  }
  cleaned = cleaned.replace(/[OIL]/g, (c) => CORRECTIONS[c] ?? c);
  const wellFormed =
    cleaned.length === TOKEN_LENGTH && [...cleaned].every((c) => CROCKFORD_ALPHABET.includes(c));
  if (!wellFormed) {
    throw new ValidationError('Jeton de provisioning invalide');
  }
  return cleaned;
}

/** Empreinte SHA-256 (hex) : la seule forme du jeton stockee en base. */
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/** Les 4 derniers caracteres, pour reconnaitre une box sans exposer le jeton. */
export function tokenSuffix(token: string): string {
  return token.slice(-4);
}

// ----- Cle API de la box (Authorization: Bearer neo_box_...) -----

export const BOX_KEY_PREFIX = 'neo_box_';
const BOX_KEY_BYTES = 24;

export function generateBoxApiKey(): string {
  return BOX_KEY_PREFIX + randomBytes(BOX_KEY_BYTES).toString('hex');
}

export function isBoxApiKeyFormat(raw: string): boolean {
  return raw.startsWith(BOX_KEY_PREFIX) && raw.length === BOX_KEY_PREFIX.length + BOX_KEY_BYTES * 2;
}

export function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ----- Presence -----

// La box envoie un heartbeat toutes les 60 s ; au-dela de 5 min sans nouvelles,
// elle est consideree hors ligne.
export const OFFLINE_AFTER_MS = 5 * 60 * 1000;

export function isBoxOnline(lastSeenAt: Date | null, now: Date = new Date()): boolean {
  return lastSeenAt !== null && now.getTime() - lastSeenAt.getTime() < OFFLINE_AFTER_MS;
}

// ----- Reponse a une annonce de la box (POST /announce) -----

export type AnnounceOutcome =
  | { kind: 'register' }
  | { kind: 'wait'; status: 'unclaimed' | 'enrolled' | 'revoked' }
  | { kind: 'deliver'; apiKey: string };

/**
 * Decide ce que l'annonce d'une box declenche. Pure, sans base :
 *  - jeton inconnu          -> on l'enregistre, en attente d'un installateur
 *  - claimed + cle en attente -> on LIVRE la cle (une seule fois)
 *  - sinon                  -> la box attend (ou est revoquee)
 */
export function resolveAnnounce(box: Pick<Box, 'status' | 'apiKeyPending'> | null): AnnounceOutcome {
  if (box === null) return { kind: 'register' };
  if (box.status === 'claimed' && box.apiKeyPending) {
    return { kind: 'deliver', apiKey: box.apiKeyPending };
  }
  if (box.status === 'claimed') return { kind: 'wait', status: 'unclaimed' };
  return { kind: 'wait', status: box.status };
}
