import { Hono } from 'hono';
import { env } from '../../config/env';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireIntegrateurOrAdmin } from '../../middleware/rbac.middleware';
import * as svc from './signatures.service';

// ---------------------------------------------------------------------------
// Staff API routes (JWT protected)
// ---------------------------------------------------------------------------

const signaturesRouter = new Hono();
signaturesRouter.use('/devis/*', authMiddleware, requireIntegrateurOrAdmin());

// GET /api/devis/:id/signature
signaturesRouter.get('/devis/:id/signature', async (c) => {
  const id = c.req.param('id');
  const request = await svc.getSignatureRequest(id);
  return c.json({ signatureRequest: request ?? null });
});

// POST /api/devis/:id/signature
// body: { mode: 'remote' | 'direct' }
signaturesRouter.post('/devis/:id/signature', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({})) as { mode?: string };
  const mode = body.mode === 'direct' ? 'direct' : 'remote';

  if (mode === 'direct') {
    // Direct: create signing session, return URL to our own signing page
    const { id: requestId } = await svc.createDirectSigningRequest(id);

    // Build signing URL using the request's Host header
    const host = c.req.header('host') ?? '192.168.1.30:3000';
    const proto = c.req.header('x-forwarded-proto') ?? 'http';
    const signingUrl = `${proto}://${host}/signer/${requestId}`;

    return c.json({ id: requestId, signingUrl, status: 'pending', mode: 'direct' }, 201);
  } else {
    // Remote: send via DocuSeal email
    try {
      const result = await svc.createRemoteSigningRequest(id);
      return c.json({
        id: result.id,
        signingUrl: result.signingUrl,
        status: 'pending',
        mode: 'remote',
        sentTo: result.sentTo,
      }, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[signatures] remote signing error:', message);
      return c.json({
        error: {
          message: message || 'Erreur lors de la création de la signature',
          code: 'SIGNATURE_ERROR',
        },
      }, 500);
    }
  }
});

// GET /api/devis/:id/signature/refresh
signaturesRouter.get('/devis/:id/signature/refresh', async (c) => {
  const id = c.req.param('id');
  const result = await svc.refreshSignatureStatus(id);
  return c.json({ status: result?.status ?? null, signingUrl: result?.signingUrl ?? null });
});

// DELETE /api/devis/:id/signature
signaturesRouter.delete('/devis/:id/signature', async (c) => {
  const id = c.req.param('id');
  await svc.cancelSignatureRequest(id);
  return c.json({ message: 'Demande de signature annulée' });
});

// GET /api/devis/:id/contrat.pdf
signaturesRouter.get('/devis/:id/contrat.pdf', async (c) => {
  const id = c.req.param('id');
  const pdfBytes = await svc.previewContractPdf(id);
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="contrat-${id}.pdf"`,
    },
  });
});

// ---------------------------------------------------------------------------
// Public signing page (no JWT — accessed from WebView / browser)
// ---------------------------------------------------------------------------

const signingPageRouter = new Hono();

// GET /signer/:id — show signing page
signingPageRouter.get('/signer/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const html = await svc.getSigningPage(id);
    return c.html(html);
  } catch (err: any) {
    return c.html(`<html><body style="font-family:sans-serif;padding:40px;text-align:center">
      <h2 style="color:#c00">Lien invalide</h2>
      <p>Cette page de signature n'existe pas ou a expiré.</p>
    </body></html>`, 404);
  }
});

// POST /signer/:id/submit — save signature
signingPageRouter.post('/signer/:id/submit', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json() as { signatureData?: string };
  if (!body.signatureData) {
    return c.json({ error: 'signatureData requis' }, 400);
  }
  await svc.submitDirectSignature(id, body.signatureData);
  return c.json({ ok: true });
});

// GET /signer/:id/success — confirmation page
signingPageRouter.get('/signer/:id/success', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>Devis signé</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f0f9f0; }
    .card { background: #fff; border-radius: 20px; padding: 48px 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.1); max-width: 400px; }
    .icon { font-size: 72px; margin-bottom: 16px; }
    h1 { color: #1a7f45; font-size: 24px; margin-bottom: 12px; }
    p { color: #555; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Devis signé !</h1>
    <p>Merci pour votre signature. Le devis a été accepté et enregistré.</p>
    <p style="margin-top:16px;font-size:13px;color:#888">Vous pouvez fermer cette fenêtre.</p>
  </div>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// DocuSeal webhook (public, HMAC-verified when DOCUSEAL_WEBHOOK_SECRET is set)
// ---------------------------------------------------------------------------

const webhookRouter = new Hono();

webhookRouter.post('/webhook/docuseal', async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature = c.req.header('x-docuseal-signature');
    const ok = await svc.verifyDocusealWebhook(
      rawBody,
      signature,
      env.DOCUSEAL_WEBHOOK_SECRET,
    );
    if (!ok) {
      console.warn('[docuseal] webhook signature verification failed');
      return c.json({ error: 'invalid signature' }, 401);
    }
    const payload = JSON.parse(rawBody);
    await svc.handleDocusealWebhook(payload);
    return c.json({ ok: true });
  } catch (e) {
    console.error('DocuSeal webhook error:', e);
    // Return 200 to prevent DocuSeal from retrying on malformed payloads
    return c.json({ ok: false }, 200);
  }
});

export { signaturesRouter, signingPageRouter, webhookRouter };
