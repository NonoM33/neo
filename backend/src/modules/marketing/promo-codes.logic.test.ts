import { describe, expect, it } from 'bun:test';
import type { PromoCode } from '../../db/schema';
import {
  computePromoDiscount,
  evaluatePromoCode,
  type PromoEvaluationContext,
} from './promo-codes.logic';

// Construit un code promo de test avec des valeurs par défaut raisonnables.
function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: 'promo-1',
    code: 'NOEL10',
    description: null,
    discountType: 'pourcentage',
    discountValue: '10',
    minOrderHT: null,
    maxUses: null,
    usedCount: 0,
    perClientOnce: false,
    active: true,
    startsAt: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function ctx(overrides: Partial<PromoEvaluationContext> = {}): PromoEvaluationContext {
  return {
    totalHT: 1000,
    now: new Date('2026-06-05'),
    clientRedemptions: 0,
    ...overrides,
  };
}

describe('computePromoDiscount', () => {
  it('applique un pourcentage', () => {
    expect(computePromoDiscount(makePromo({ discountType: 'pourcentage', discountValue: '10' }), 1000)).toBe(100);
  });

  it('applique un montant fixe', () => {
    expect(
      computePromoDiscount(makePromo({ discountType: 'montant_fixe', discountValue: '50' }), 1000),
    ).toBe(50);
  });

  it('plafonne un montant fixe au total HT (jamais de net négatif)', () => {
    expect(
      computePromoDiscount(makePromo({ discountType: 'montant_fixe', discountValue: '500' }), 200),
    ).toBe(200);
  });

  it('arrondit à 2 décimales', () => {
    expect(
      computePromoDiscount(makePromo({ discountType: 'pourcentage', discountValue: '33.33' }), 99.99),
    ).toBe(33.33);
  });
});

describe('evaluatePromoCode', () => {
  it('valide un code actif sans contrainte et calcule la remise', () => {
    const result = evaluatePromoCode(makePromo(), ctx());
    expect(result).toEqual({ valid: true, discountAmount: 100 });
  });

  it('rejette un code inactif', () => {
    const result = evaluatePromoCode(makePromo({ active: false }), ctx());
    expect(result).toEqual({ valid: false, reason: 'inactif' });
  });

  it('rejette un code pas encore actif', () => {
    const result = evaluatePromoCode(
      makePromo({ startsAt: new Date('2026-07-01') }),
      ctx({ now: new Date('2026-06-05') }),
    );
    expect(result).toEqual({ valid: false, reason: 'pas_encore_actif' });
  });

  it('rejette un code expiré', () => {
    const result = evaluatePromoCode(
      makePromo({ expiresAt: new Date('2026-05-01') }),
      ctx({ now: new Date('2026-06-05') }),
    );
    expect(result).toEqual({ valid: false, reason: 'expire' });
  });

  it('rejette quand le quota global est atteint', () => {
    const result = evaluatePromoCode(makePromo({ maxUses: 5, usedCount: 5 }), ctx());
    expect(result).toEqual({ valid: false, reason: 'quota_atteint' });
  });

  it('rejette quand le client a déjà utilisé le code (perClientOnce)', () => {
    const result = evaluatePromoCode(
      makePromo({ perClientOnce: true }),
      ctx({ clientRedemptions: 1 }),
    );
    expect(result).toEqual({ valid: false, reason: 'deja_utilise' });
  });

  it('autorise un client qui n\'a pas encore utilisé le code (perClientOnce)', () => {
    const result = evaluatePromoCode(
      makePromo({ perClientOnce: true }),
      ctx({ clientRedemptions: 0 }),
    );
    expect(result).toEqual({ valid: true, discountAmount: 100 });
  });

  it('rejette quand le montant minimum de commande n\'est pas atteint', () => {
    const result = evaluatePromoCode(
      makePromo({ minOrderHT: '1500' }),
      ctx({ totalHT: 1000 }),
    );
    expect(result).toEqual({ valid: false, reason: 'montant_minimum' });
  });

  it('valide quand le montant minimum est atteint', () => {
    const result = evaluatePromoCode(
      makePromo({ minOrderHT: '1000', discountType: 'montant_fixe', discountValue: '80' }),
      ctx({ totalHT: 1000 }),
    );
    expect(result).toEqual({ valid: true, discountAmount: 80 });
  });

  it('accepte pile à la borne de validité (startsAt == now)', () => {
    const now = new Date('2026-06-05T10:00:00Z');
    const result = evaluatePromoCode(makePromo({ startsAt: now }), ctx({ now }));
    expect(result.valid).toBe(true);
  });
});
