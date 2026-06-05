import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { validatePromoCodeSchema } from './marketing.schema';
import { getActiveBanner } from './banners.service';
import { getActivePopup } from './popups.service';
import { validatePromoForOrder } from './promo-codes.service';

/**
 * Routes marketing publiques (sans auth) consommées par le site vitrine et le
 * configurateur : bannière active, pop-up active, et validation d'un code promo.
 */
const marketingPublicRouter = new Hono();

// Bannière à afficher en haut du site (ou null).
marketingPublicRouter.get('/banner', async (c) => {
  return c.json({ banner: await getActiveBanner() });
});

// Pop-up publicitaire à afficher (ou null), avec son code promo résolu.
marketingPublicRouter.get('/popup', async (c) => {
  return c.json({ popup: await getActivePopup() });
});

// Valide un code promo pour un total HT donné. Renvoie la remise calculée.
marketingPublicRouter.post(
  '/promo-codes/validate',
  zValidator('json', validatePromoCodeSchema),
  async (c) => {
    const { code, totalHT, email } = c.req.valid('json');
    const { promo, discountAmount } = await validatePromoForOrder(code, totalHT, { email });
    return c.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
    });
  },
);

export default marketingPublicRouter;
