import type { MiddlewareHandler } from 'hono';

// Les scripts de widgets embarquables (feedback, chatbot) sont chargés en
// cross-origin depuis le site vitrine, le CRM et le back-office. Or
// `secureHeaders()` pose `Cross-Origin-Resource-Policy: same-origin`, ce qui
// fait bloquer le <script src> par le navigateur
// (net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) → le bouton flottant n'apparaît
// jamais sur les autres domaines.
//
// Ce middleware repasse le CORP en `cross-origin` pour ces seuls scripts. Il
// DOIT être enregistré AVANT `secureHeaders()` : sa phase post-`next()`
// s'exécute alors après celle de secureHeaders et peut donc écraser l'en-tête
// que secureHeaders vient de poser.
export const relaxWidgetCorp: MiddlewareHandler = async (c, next) => {
  await next();
  if (c.req.path.endsWith('-widget.js')) {
    c.res.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
};
