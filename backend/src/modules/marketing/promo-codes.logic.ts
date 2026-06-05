import type { PromoCode } from '../../db/schema';

/**
 * Logique pure de validation / calcul d'un code promo, sans accès base.
 * Isolée ici pour être testable sans DB ni HTTP (cf. règle de non-régression).
 */

export type PromoRejectionReason =
  | 'inactif'
  | 'pas_encore_actif'
  | 'expire'
  | 'quota_atteint'
  | 'deja_utilise'
  | 'montant_minimum';

export interface PromoEvaluationContext {
  /** Total HT du devis avant remise promo. */
  totalHT: number;
  /** Date de référence (injectable pour les tests). */
  now: Date;
  /** Nombre d'utilisations déjà faites par ce client (pour perClientOnce). */
  clientRedemptions: number;
}

export type PromoEvaluation =
  | { valid: true; discountAmount: number }
  | { valid: false; reason: PromoRejectionReason };

/** Arrondi monétaire à 2 décimales, sans erreurs de flottant. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Montant de remise (€ HT) qu'appliquerait un code promo sur un total donné.
 * Plafonné au total HT pour ne jamais produire un net négatif.
 */
export function computePromoDiscount(promo: PromoCode, totalHT: number): number {
  const value = Number(promo.discountValue);
  const raw =
    promo.discountType === 'pourcentage' ? totalHT * (value / 100) : value;
  return round2(Math.min(Math.max(raw, 0), Math.max(totalHT, 0)));
}

/**
 * Évalue si un code promo est applicable dans un contexte donné et calcule la
 * remise. Toutes les règles (fenêtre de validité, quota global, unicité client,
 * montant minimum) sont vérifiées ici.
 */
export function evaluatePromoCode(
  promo: PromoCode,
  ctx: PromoEvaluationContext,
): PromoEvaluation {
  if (!promo.active) {
    return { valid: false, reason: 'inactif' };
  }

  if (promo.startsAt && ctx.now < promo.startsAt) {
    return { valid: false, reason: 'pas_encore_actif' };
  }

  if (promo.expiresAt && ctx.now > promo.expiresAt) {
    return { valid: false, reason: 'expire' };
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { valid: false, reason: 'quota_atteint' };
  }

  if (promo.perClientOnce && ctx.clientRedemptions > 0) {
    return { valid: false, reason: 'deja_utilise' };
  }

  if (promo.minOrderHT !== null && ctx.totalHT < Number(promo.minOrderHT)) {
    return { valid: false, reason: 'montant_minimum' };
  }

  return { valid: true, discountAmount: computePromoDiscount(promo, ctx.totalHT) };
}

export const PROMO_REJECTION_MESSAGES: Record<PromoRejectionReason, string> = {
  inactif: "Ce code promo n'est plus actif",
  pas_encore_actif: "Ce code promo n'est pas encore actif",
  expire: 'Ce code promo a expiré',
  quota_atteint: "Ce code promo a atteint son nombre maximum d'utilisations",
  deja_utilise: 'Vous avez déjà utilisé ce code promo',
  montant_minimum: 'Le montant minimum de commande n\'est pas atteint',
};
