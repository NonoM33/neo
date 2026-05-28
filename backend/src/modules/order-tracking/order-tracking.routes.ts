/**
 * Public order tracking routes (no JWT — token-protected).
 *
 *   GET /suivi-commande/:token        → HTML tracking page
 *   GET /suivi-commande/:token/status → JSON for polling clients
 *
 * Also exposes an authenticated admin/integrator endpoint to mint a
 * tracking URL the salesperson can paste into a follow-up email:
 *   POST /api/commandes/:id/tracking-url  → { token, url }
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  orders,
  projects,
  clients,
} from '../../db/schema';
import { env } from '../../config/env';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireIntegrateurOrAdmin } from '../../middleware/rbac.middleware';
import {
  signOrderTrackingToken,
  verifyOrderTrackingToken,
} from './order-tracking.token';
import {
  renderOrderTrackingPage,
  type OrderTrackingPageData,
} from './order-tracking.page';

// ── Public router (mounted at /suivi-commande) ──────────────────────────

export const publicOrderTrackingRouter = new Hono();

async function loadTracking(orderId: string): Promise<OrderTrackingPageData | null> {
  const [row] = await db
    .select({
      number: orders.number,
      status: orders.status,
      totalTTC: orders.totalTTC,
      createdAt: orders.createdAt,
      confirmedAt: orders.confirmedAt,
      paidAt: orders.paidAt,
      shippedAt: orders.shippedAt,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
      carrier: orders.carrier,
      trackingNumber: orders.trackingNumber,
      shippingAddress: orders.shippingAddress,
      shippingCity: orders.shippingCity,
      shippingPostalCode: orders.shippingPostalCode,
      projectName: projects.name,
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName,
    })
    .from(orders)
    .innerJoin(projects, eq(orders.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row) return null;
  return row as OrderTrackingPageData;
}

publicOrderTrackingRouter.get('/:token', async (c) => {
  const token = c.req.param('token');
  const verified = await verifyOrderTrackingToken(token);
  if (!verified) {
    return c.html(
      `<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#c00">Lien invalide ou expiré</h2>
        <p>Ce lien de suivi n'est plus actif. Contactez-nous si vous avez besoin d'aide.</p>
      </body></html>`,
      401,
    );
  }

  const data = await loadTracking(verified.orderId);
  if (!data) {
    return c.html(
      `<!doctype html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:#c00">Commande introuvable</h2>
      </body></html>`,
      404,
    );
  }

  return c.html(renderOrderTrackingPage(data));
});

publicOrderTrackingRouter.get('/:token/status', async (c) => {
  const token = c.req.param('token');
  const verified = await verifyOrderTrackingToken(token);
  if (!verified) {
    return c.json({ error: 'invalid token' }, 401);
  }
  const data = await loadTracking(verified.orderId);
  if (!data) return c.json({ error: 'not found' }, 404);
  return c.json({
    number: data.number,
    status: data.status,
    confirmedAt: data.confirmedAt,
    paidAt: data.paidAt,
    shippedAt: data.shippedAt,
    deliveredAt: data.deliveredAt,
    cancelledAt: data.cancelledAt,
    carrier: data.carrier,
    trackingNumber: data.trackingNumber,
  });
});

// ── Authenticated mint endpoint ─────────────────────────────────────────

export const orderTrackingMintRouter = new Hono();

orderTrackingMintRouter.use('*', authMiddleware, requireIntegrateurOrAdmin());

orderTrackingMintRouter.post('/:id/tracking-url', async (c) => {
  const id = c.req.param('id');
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return c.json({ error: 'order not found' }, 404);

  const token = await signOrderTrackingToken(order.id);
  const baseUrl = env.PUBLIC_URL.replace(/\/$/, '');
  return c.json({
    token,
    url: `${baseUrl}/suivi-commande/${token}`,
  });
});
