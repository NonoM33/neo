import Stripe from 'stripe';
import { env } from '../../config/env';

/**
 * Instance Stripe paresseuse : créée une seule fois, uniquement si une clé
 * secrète est configurée. L'app peut donc booter sans Stripe (dev/staging non
 * configuré) — les routes de paiement renvoient alors une erreur explicite.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe non configuré (STRIPE_SECRET_KEY manquant)');
  }
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY, {
      // Laisse le SDK choisir la version d'API par défaut épinglée à sa version.
      typescript: true,
      appInfo: { name: 'neo-domotique' },
    });
  }
  return cached;
}
