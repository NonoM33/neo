import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import {
  createPromoCodeSchema,
  updatePromoCodeSchema,
  bannerSchema,
  popupSchema,
  campaignSchema,
} from './marketing.schema';
import * as promoCodes from './promo-codes.service';
import * as banners from './banners.service';
import * as popups from './popups.service';
import * as campaigns from './campaigns.service';

/**
 * Routes d'administration marketing (réservées aux admins) :
 * codes promo, bannières, pop-ups et campagnes email.
 */
const marketingRouter = new Hono();

marketingRouter.use('/*', authMiddleware, requireAdmin());

// ── Codes promo ────────────────────────────────────────────────
marketingRouter.get('/promo-codes', async (c) => c.json(await promoCodes.listPromoCodes()));

marketingRouter.get('/promo-codes/:id', async (c) =>
  c.json(await promoCodes.getPromoCode(c.req.param('id'))),
);

marketingRouter.get('/promo-codes/:id/stats', async (c) =>
  c.json(await promoCodes.getPromoCodeStats(c.req.param('id'))),
);

marketingRouter.post('/promo-codes', zValidator('json', createPromoCodeSchema), async (c) =>
  c.json(await promoCodes.createPromoCode(c.req.valid('json')), 201),
);

marketingRouter.put('/promo-codes/:id', zValidator('json', updatePromoCodeSchema), async (c) =>
  c.json(await promoCodes.updatePromoCode(c.req.param('id'), c.req.valid('json'))),
);

marketingRouter.delete('/promo-codes/:id', async (c) => {
  await promoCodes.deletePromoCode(c.req.param('id'));
  return c.json({ message: 'Code promo supprimé' });
});

// ── Bannières ──────────────────────────────────────────────────
marketingRouter.get('/banners', async (c) => c.json(await banners.listBanners()));

marketingRouter.get('/banners/:id', async (c) =>
  c.json(await banners.getBanner(c.req.param('id'))),
);

marketingRouter.post('/banners', zValidator('json', bannerSchema), async (c) =>
  c.json(await banners.createBanner(c.req.valid('json')), 201),
);

marketingRouter.put('/banners/:id', zValidator('json', bannerSchema), async (c) =>
  c.json(await banners.updateBanner(c.req.param('id'), c.req.valid('json'))),
);

marketingRouter.delete('/banners/:id', async (c) => {
  await banners.deleteBanner(c.req.param('id'));
  return c.json({ message: 'Bannière supprimée' });
});

// ── Pop-ups ────────────────────────────────────────────────────
marketingRouter.get('/popups', async (c) => c.json(await popups.listPopups()));

marketingRouter.get('/popups/:id', async (c) =>
  c.json(await popups.getPopup(c.req.param('id'))),
);

marketingRouter.post('/popups', zValidator('json', popupSchema), async (c) =>
  c.json(await popups.createPopup(c.req.valid('json')), 201),
);

marketingRouter.put('/popups/:id', zValidator('json', popupSchema), async (c) =>
  c.json(await popups.updatePopup(c.req.param('id'), c.req.valid('json'))),
);

marketingRouter.delete('/popups/:id', async (c) => {
  await popups.deletePopup(c.req.param('id'));
  return c.json({ message: 'Pop-up supprimée' });
});

// ── Campagnes email ────────────────────────────────────────────
marketingRouter.get('/campaigns', async (c) => c.json(await campaigns.listCampaigns()));

marketingRouter.get('/campaigns/:id', async (c) =>
  c.json(await campaigns.getCampaign(c.req.param('id'))),
);

marketingRouter.get('/campaigns/:id/recipients', async (c) =>
  c.json(await campaigns.getCampaignRecipients(c.req.param('id'))),
);

marketingRouter.post('/campaigns', zValidator('json', campaignSchema), async (c) => {
  const user = c.get('user');
  return c.json(await campaigns.createCampaign(c.req.valid('json'), user?.email), 201);
});

marketingRouter.put('/campaigns/:id', zValidator('json', campaignSchema), async (c) =>
  c.json(await campaigns.updateCampaign(c.req.param('id'), c.req.valid('json'))),
);

marketingRouter.delete('/campaigns/:id', async (c) => {
  await campaigns.deleteCampaign(c.req.param('id'));
  return c.json({ message: 'Campagne supprimée' });
});

marketingRouter.post('/campaigns/:id/send', async (c) =>
  c.json(await campaigns.sendCampaign(c.req.param('id'))),
);

export default marketingRouter;
