import { describe, expect, it } from 'bun:test';
import {
  BOX_KEY_PREFIX,
  generateBoxApiKey,
  hashSecret,
  isBoxApiKeyFormat,
  isBoxOnline,
  normalizeProvisioningToken,
  resolveAnnounce,
  tokenSuffix,
} from './boxes.domain';

const VALID = '7K3M9PQR2STVWXYZ4ABC';

describe('normalizeProvisioningToken', () => {
  it('accepte un jeton canonique', () => {
    expect(normalizeProvisioningToken(VALID)).toBe(VALID);
  });

  it('accepte le contenu du QR (schema NEO:) et le code recopie avec tirets', () => {
    expect(normalizeProvisioningToken('NEO:' + VALID)).toBe(VALID);
    expect(normalizeProvisioningToken(' 7k3m-9pqr-2stv-wxyz-4abc ')).toBe(VALID);
  });

  it('corrige les glyphes confondables (O->0, I/L->1) au lieu de rejeter', () => {
    expect(normalizeProvisioningToken('OK3M9PQR2STVWXYZ4ABC')).toBe('0K3M9PQR2STVWXYZ4ABC');
    expect(normalizeProvisioningToken('iK3M9PQR2STVWXYZ4ABl')).toBe('1K3M9PQR2STVWXYZ4AB1');
  });

  it.each(['', '7K3M', VALID + 'A', '7K3M9PQR2STVWXYZ4ABU', '7K3M9PQR2STVWXYZ4AB!'])(
    'refuse %j',
    (raw) => {
      expect(() => normalizeProvisioningToken(raw)).toThrow('Jeton de provisioning invalide');
    },
  );
});

describe('empreintes et suffixe', () => {
  it('sha256 hex de 64 caracteres, deterministe', () => {
    expect(hashSecret(VALID)).toHaveLength(64);
    expect(hashSecret(VALID)).toBe(hashSecret(VALID));
    expect(hashSecret(VALID)).not.toBe(hashSecret(VALID + 'x'));
  });

  it('le suffixe est fait des 4 derniers caracteres', () => {
    expect(tokenSuffix(VALID)).toBe('4ABC');
  });
});

describe('cle API de box', () => {
  it('a le prefixe neo_box_ et 48 hex, et est reconnue comme telle', () => {
    const key = generateBoxApiKey();
    expect(key.startsWith(BOX_KEY_PREFIX)).toBe(true);
    expect(key).toHaveLength(BOX_KEY_PREFIX.length + 48);
    expect(isBoxApiKeyFormat(key)).toBe(true);
    expect(isBoxApiKeyFormat('neo_sk_' + 'a'.repeat(48))).toBe(false);
  });

  it('est unique a chaque generation', () => {
    const keys = new Set(Array.from({ length: 30 }, generateBoxApiKey));
    expect(keys.size).toBe(30);
  });
});

describe('isBoxOnline', () => {
  const now = new Date('2026-09-03T10:00:00Z');
  it('en ligne si vue il y a moins de 5 minutes', () => {
    expect(isBoxOnline(new Date('2026-09-03T09:56:00Z'), now)).toBe(true);
    expect(isBoxOnline(new Date('2026-09-03T09:55:00Z'), now)).toBe(false);
    expect(isBoxOnline(null, now)).toBe(false);
  });
});

describe('resolveAnnounce', () => {
  it('enregistre une box inconnue', () => {
    expect(resolveAnnounce(null)).toEqual({ kind: 'register' });
  });

  it('fait attendre une box non rattachee', () => {
    expect(resolveAnnounce({ status: 'unclaimed', apiKeyPending: null })).toEqual({
      kind: 'wait',
      status: 'unclaimed',
    });
  });

  it('livre la cle une fois la box rattachee, puis plus jamais', () => {
    expect(resolveAnnounce({ status: 'claimed', apiKeyPending: 'neo_box_abc' })).toEqual({
      kind: 'deliver',
      apiKey: 'neo_box_abc',
    });
    expect(resolveAnnounce({ status: 'enrolled', apiKeyPending: null })).toEqual({
      kind: 'wait',
      status: 'enrolled',
    });
  });

  it('une box revoquee est informee', () => {
    expect(resolveAnnounce({ status: 'revoked', apiKeyPending: null })).toEqual({
      kind: 'wait',
      status: 'revoked',
    });
  });
});
