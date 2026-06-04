/**
 * Génération et manipulation des codes de configuration ("type IKEA").
 * Fonctions pures (random injectable) pour rester testables.
 */

// Alphabet sans caractères ambigus (pas de 0/O, 1/I/L) — lisible et dictable.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomChars(count: number, random: () => number): string {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(random() * ALPHABET.length) % ALPHABET.length;
    out += ALPHABET[idx];
  }
  return out;
}

export function generateDraftCode(random: () => number = Math.random): string {
  return `NEO-${randomChars(4, random)}-${randomChars(4, random)}`;
}

/** Normalise une origine cliente en scheme+host http(s) ; null si invalide. */
export function sanitizeOrigin(origin: string | undefined | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function buildResumeUrl(base: string, code: string): string {
  return `${base.replace(/\/$/, '')}/configurateur?code=${code}`;
}
