import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { errorHandler } from './middleware/error.middleware';
import { blockUiOnApiHost } from './middleware/api-host-only.middleware';
import { relaxWidgetCorp } from './middleware/widget-corp.middleware';

import { authRoutes } from './modules/auth';
import { usersRoutes } from './modules/users';
import { projectsRoutes } from './modules/projects';
import { roomsRoutes } from './modules/rooms';
import { photosRoutes } from './modules/photos';
import { devicesRoutes } from './modules/devices';
import { productsRoutes } from './modules/products';
import { quotesRoutes } from './modules/quotes';
import { ordersRoutes } from './modules/orders';
import { stockRoutes } from './modules/stock';
import { supplierOrdersRoutes } from './modules/supplier-orders';
import { suppliersRoutes } from './modules/suppliers';
import { invoicesRoutes } from './modules/invoices';
import {
  paymentsRouter,
  publicPayRouter,
  paymentsWebhookRouter,
} from './modules/payments';
import { syncRoutes } from './modules/sync';
import { leadsRoutes } from './modules/leads';
import { activitiesRoutes } from './modules/activities';
import { kpisRoutes } from './modules/kpis';
import { appointmentsRoutes, availabilityRoutes } from './modules/appointments';
import { rolesRoutes } from './modules/roles';
import { systemTokensRoutes } from './modules/system-tokens';
import { bookingRoutes } from './modules/booking';
import { devisRoutes } from './modules/devis';
import { configurateurRoutes } from './modules/configurateur';
import { calendarSyncRoutes } from './modules/calendar-sync';
import { callsRoutes } from './modules/calls';
import { trackingRoutes, publicTrackingRoutes } from './modules/tracking';
import { newsletterTrackingRoutes, newsletterRoutes } from './modules/newsletter';
import { cloudInstancesRoutes } from './modules/cloud-instances';
import { boxesRoutes } from './modules/boxes';
import { floorPlansRoutes } from './modules/floor-plans';
import { signaturesRouter, signingPageRouter, webhookRouter } from './modules/signatures';
import {
  publicOrderTrackingRouter,
  orderTrackingMintRouter,
} from './modules/order-tracking';
import { clientAuthRoutes, ticketsRoutes, kbRoutes, chatRoutes } from './support';

import { scanSessionsRoutes } from './modules/scan-sessions';
import adminRoutes from './admin/admin.routes';
import backofficeRoutes from './backoffice/backoffice.routes';
import { recetteExportRoutes, recetteRoutes } from './modules/recette';
import { feedbackApiRoutes, feedbackWidgetRoutes } from './modules/feedback';
import { chatbotRoutes } from './modules/chatbot';
import templatesRoutes from './modules/templates/templates.routes';
import { marketingRoutes, marketingPublicRoutes } from './modules/marketing';
import { createMcpRoutes } from './modules/mcp-api';
import swaggerRoutes from './swagger/swagger.routes';

const app = new Hono();

// Middleware
app.use('*', logger());
// Doit précéder secureHeaders() pour pouvoir réécrire le CORP des widgets.
app.use('*', relaxWidgetCorp);
app.use('*', secureHeaders());
// Sur les hôtes "API seule", masque les interfaces HTML (back-office/admin/swagger).
app.use('*', blockUiOnApiHost);
app.use(
  '/api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);
// Widget de feedback : appele en cross-origin depuis le CRM, le site et l'app.
app.use(
  '/feedback-api/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  })
);

// Error handler
app.onError(errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Scan Sessions — PUBLIC routes (no auth, accessed by iPhone via QR code)
app.route('/', scanSessionsRoutes);

// Client-facing routes (must be registered BEFORE generic /api routes
// which use catch-all middleware that would intercept /api/client/* paths)
// Public booking routes (no auth required)
app.route('/api/public/booking', bookingRoutes);
// Public devis (quote request) route (no auth required)
app.route('/api/public/devis', devisRoutes);
// Box physiques : /api/boxes/announce est appele par une box SANS cle (1er boot).
// Doit etre monte avant les routeurs /api a middleware catch-all, sinon 401.
app.route('/api/boxes', boxesRoutes);
// Public configurateur ("type IKEA") route (no auth required)
app.route('/api/public/configurateur', configurateurRoutes);
// Public marketing (bannière/popup site vitrine + validation code promo)
app.route('/api/public/marketing', marketingPublicRoutes);

// Calendar sync routes (mixed: token-based feed + JWT-authenticated management)
app.route('/api/calendar', calendarSyncRoutes);

app.route('/api/client/auth', clientAuthRoutes);
app.route('/api/client/tickets', ticketsRoutes.clientRoutes);
app.route('/api/client/kb', kbRoutes.clientRoutes);
app.route('/api/client/chat', chatRoutes);

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/projets', projectsRoutes);
app.route('/api', roomsRoutes);
app.route('/api', photosRoutes);
app.route('/api', devicesRoutes);
app.route('/api/produits', productsRoutes);
app.route('/api', quotesRoutes);
app.route('/api/commandes', ordersRoutes);
app.route('/api/stock', stockRoutes);
app.route('/api/commandes-fournisseurs', supplierOrdersRoutes);
app.route('/api/fournisseurs', suppliersRoutes);
app.route('/api/factures', invoicesRoutes);
app.route('/api/payments', paymentsRouter);
app.route('/api/sync', syncRoutes);
app.route('/api/tickets', ticketsRoutes.staffRoutes);
app.route('/api/kb', kbRoutes.staffRoutes);
app.route('/api/templates', templatesRoutes);
app.route('/api/marketing', marketingRoutes);
app.route('/api/newsletter', newsletterRoutes);

// CRM Routes
app.route('/api/leads', leadsRoutes);
app.route('/api/activities', activitiesRoutes);
app.route('/api/kpis', kpisRoutes);
app.route('/api/appointments', appointmentsRoutes);
app.route('/api/availability', availabilityRoutes);
app.route('/api/roles', rolesRoutes);
app.route('/api/system-tokens', systemTokensRoutes);
app.route('/api/calls', callsRoutes);
app.route('/api/tracking', trackingRoutes);
app.route('/api/cloud-instances', cloudInstancesRoutes);
app.route('/api', floorPlansRoutes);
app.route('/api', signaturesRouter);
app.route('/api/recette', recetteRoutes);
app.route('/', signingPageRouter);
app.route('/', webhookRouter);

// Page de paiement publique (sans auth, jeton signé) + webhook Stripe
app.route('/payer', publicPayRouter);
app.route('/', paymentsWebhookRouter);

// Public tracking page (no auth, token-based)
app.route('/tracking', publicTrackingRoutes);

// Newsletter open-tracking pixel + unsubscribe (no auth, token-based)
app.route('/track', newsletterTrackingRoutes);

// Public order tracking page (no auth, HMAC-signed token)
app.route('/suivi-commande', publicOrderTrackingRouter);

// Authenticated endpoint to mint a tracking URL for a given order
app.route('/api/commandes', orderTrackingMintRouter);

// Serveur MCP (Streamable HTTP) : expose toute l'API aux clients MCP via le
// jeton système. Forwarde les appels d'outils in-process à `app` (RBAC réutilisé).
app.route('/mcp', createMcpRoutes(app));

// Swagger
app.route('/swagger', swaggerRoutes);

// Admin routes
app.route('/admin', adminRoutes);

// Backoffice routes
app.route('/backoffice', backofficeRoutes);
app.route('/recette-api', recetteExportRoutes);

// Widget de feedback terrain (bouton flottant) — public, CORS ouvert.
app.route('/feedback-api', feedbackApiRoutes);
app.route('/', feedbackWidgetRoutes);

// Chatbot du site vitrine : WebSocket visiteur + staff, et widget JS public.
app.route('/', chatbotRoutes);

// 404
app.notFound((c) => {
  return c.json({ error: { message: 'Route non trouvée', code: 'NOT_FOUND' } }, 404);
});

export default app;
