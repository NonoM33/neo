import { ValidationError } from '../../lib/errors';
import type { PaymentTargetType } from './payments.schema';

export const DEFAULT_DEPOSIT_PERCENT = 30;

interface ComputeAmountArgs {
  targetType: PaymentTargetType;
  /** Total TTC de la cible (string Drizzle decimal ou number). */
  totalTTC: string | number;
  /** Pourcentage d'acompte pour un quote_deposit (1–100). */
  depositPercent?: number;
}

/**
 * Montant à encaisser, en centimes (unité Stripe), à partir du total TTC de la
 * cible. Une facture/commande est réglée intégralement ; un acompte sur devis
 * applique `depositPercent` (défaut 30 %). Lève une ValidationError si le montant
 * obtenu n'est pas un entier positif (cible vide, total non numérique…).
 */
export function computeAmountCents({
  targetType,
  totalTTC,
  depositPercent,
}: ComputeAmountArgs): number {
  const total = typeof totalTTC === 'number' ? totalTTC : parseFloat(totalTTC);
  if (!Number.isFinite(total) || total <= 0) {
    throw new ValidationError('Montant à régler invalide ou nul');
  }

  let ratio = 1;
  if (targetType === 'quote_deposit') {
    const percent = depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
      throw new ValidationError("Pourcentage d'acompte invalide (1 à 100)");
    }
    ratio = percent / 100;
  }

  const cents = Math.round(total * ratio * 100);
  if (cents <= 0) {
    throw new ValidationError('Montant à régler invalide ou nul');
  }
  return cents;
}
