import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { env, isStripeEnabled } from '../../config/env';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireCRMAccess } from '../../middleware/rbac.middleware';
import * as svc from './payments.service';
import { createPaymentLinkSchema, paymentFilterSchema } from './payments.schema';
import { signPaymentToken } from './payment.token';
import { renderPayLanding, renderPaySuccess, renderPayInvalid } from './payments.page';

// Base publique du backend, déduite de la requête (proxy Coolify renseigne
// x-forwarded-proto/host). Sert à construire les liens de paiement & retours.
function originFrom(c: { req: { header: (k: string) => string | undefined } }): string {
  const host = c.req.header('host') ?? 'localhost:3000';
  const proto = c.req.header('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------------
// Staff API (JWT) — création de liens & suivi des paiements
// ---------------------------------------------------------------------------

const paymentsRouter = new Hono();
paymentsRouter.use('*', authMiddleware, requireCRMAccess());

// POST /api/payments — crée (ou réutilise) un lien de paiement pour une cible.
paymentsRouter.post('/', zValidator('json', createPaymentLinkSchema), async (c) => {
  if (!isStripeEnabled) {
    return c.json(
      { error: { message: 'Paiement en ligne non configuré', code: 'STRIPE_DISABLED' } },
      503
    );
  }
  const input = c.req.valid('json');
  const userId = (c.get('userId') as string | undefined) ?? null;
  const payment = await svc.createPaymentLink(input, userId);
  const token = await signPaymentToken(payment.id, env.PAYMENT_LINK_TTL_DAYS);
  const payUrl = `${originFrom(c)}/payer/${token}`;
  return c.json({ payment, payUrl }, 201);
});

// GET /api/payments — liste paginée des paiements (filtrable).
paymentsRouter.get('/', zValidator('query', paymentFilterSchema), async (c) => {
  const filter = c.req.valid('query');
  const result = await svc.listPayments(filter);
  return c.json(result);
});

// GET /api/payments/:id — détail d'un paiement.
paymentsRouter.get('/:id', async (c) => {
  const payment = await svc.getPaymentById(c.req.param('id'));
  if (!payment) return c.json({ error: { message: 'Paiement non trouvé', code: 'NOT_FOUND' } }, 404);
  return c.json(payment);
});

// ---------------------------------------------------------------------------
// Page de paiement publique (sans JWT — ouverte par le client via le lien)
// ---------------------------------------------------------------------------

const publicPayRouter = new Hono();

// GET /payer/:token — atterrissage : montant + bouton Payer (ou page succès).
publicPayRouter.get('/:token', async (c) => {
  const token = c.req.param('token');
  const verified = await svc.verifyAndLoad(token);
  if (!verified) return c.html(renderPayInvalid(), 404);

  const { payment } = verified;
  const done = c.req.query('done') === '1';
  if (payment.status === 'succeeded' || done) {
    return c.html(renderPaySuccess(payment));
  }
  return c.html(renderPayLanding(payment, token, { canceled: c.req.query('canceled') === '1' }));
});

// POST /payer/:token/checkout — crée la session Stripe et redirige vers Checkout.
publicPayRouter.post('/:token/checkout', async (c) => {
  const token = c.req.param('token');
  const verified = await svc.verifyAndLoad(token);
  if (!verified) return c.html(renderPayInvalid(), 404);

  const { payment } = verified;
  if (payment.status === 'succeeded') {
    return c.redirect(`/payer/${token}?done=1`, 303);
  }
  if (!isStripeEnabled) return c.html(renderPayInvalid(), 503);

  const url = await svc.createCheckoutSession(payment, originFrom(c), token);
  return c.redirect(url, 303);
});

// ---------------------------------------------------------------------------
// Webhook Stripe (public, signature vérifiée via STRIPE_WEBHOOK_SECRET)
// ---------------------------------------------------------------------------

const paymentsWebhookRouter = new Hono();

paymentsWebhookRouter.post('/webhook/stripe', async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature = c.req.header('stripe-signature');
    const result = await svc.handleStripeWebhook(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    return c.json({ received: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[stripe] webhook error:', message);
    // 400 → Stripe réessaiera (utile si erreur transitoire de signature/réseau).
    return c.json({ error: 'webhook_error' }, 400);
  }
});

export { paymentsRouter, publicPayRouter, paymentsWebhookRouter };
