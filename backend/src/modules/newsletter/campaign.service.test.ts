import { describe, expect, it } from 'bun:test';
import {
  buildPixelUrl,
  buildRecipientCandidates,
  buildUnsubscribeUrl,
  computeOpenRate,
  generateToken,
  isValidEmail,
} from './campaign.service';

describe('isValidEmail', () => {
  it('accepte une adresse valide', () => {
    expect(isValidEmail('jean@example.com')).toBe(true);
  });

  it('rejette null, vide et formats invalides', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('pas-un-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});

describe('buildRecipientCandidates', () => {
  it('garde les emails valides avec leur clientId', () => {
    const result = buildRecipientCandidates(
      [
        { id: 'c1', email: 'a@x.com' },
        { id: 'c2', email: 'b@x.com' },
      ],
      []
    );
    expect(result).toEqual([
      { clientId: 'c1', email: 'a@x.com' },
      { clientId: 'c2', email: 'b@x.com' },
    ]);
  });

  it('exclut les emails invalides ou nuls', () => {
    const result = buildRecipientCandidates(
      [
        { id: 'c1', email: null },
        { id: 'c2', email: 'invalide' },
        { id: 'c3', email: 'ok@x.com' },
      ],
      []
    );
    expect(result).toEqual([{ clientId: 'c3', email: 'ok@x.com' }]);
  });

  it('exclut les desinscrits (insensible a la casse)', () => {
    const result = buildRecipientCandidates(
      [
        { id: 'c1', email: 'A@x.com' },
        { id: 'c2', email: 'b@x.com' },
      ],
      ['a@x.com']
    );
    expect(result).toEqual([{ clientId: 'c2', email: 'b@x.com' }]);
  });

  it('deduplique les emails identiques (insensible a la casse)', () => {
    const result = buildRecipientCandidates(
      [
        { id: 'c1', email: 'dup@x.com' },
        { id: 'c2', email: 'DUP@x.com' },
      ],
      []
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.clientId).toBe('c1');
  });
});

describe('computeOpenRate', () => {
  it('calcule un pourcentage arrondi a une decimale', () => {
    expect(computeOpenRate(200, 100)).toBe(50);
    expect(computeOpenRate(3, 1)).toBe(33.3);
  });

  it('renvoie 0 quand aucun envoi', () => {
    expect(computeOpenRate(0, 0)).toBe(0);
    expect(computeOpenRate(0, 5)).toBe(0);
  });
});

describe('URLs de tracking', () => {
  it('construit le pixel et le lien de desinscription sans double slash', () => {
    expect(buildPixelUrl('https://app/', 'tok')).toBe(
      'https://app/track/open/tok.png'
    );
    expect(buildUnsubscribeUrl('https://app', 'tok')).toBe(
      'https://app/track/unsubscribe/tok'
    );
  });
});

describe('generateToken', () => {
  it('genere un token hex de 64 caracteres unique', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]+$/);
    expect(a).not.toBe(b);
  });
});
