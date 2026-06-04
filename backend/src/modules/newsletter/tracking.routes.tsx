import { Hono } from 'hono';
import { recordOpen, recordUnsubscribe } from './campaign.service';

// Pixel transparent 1x1 (PNG) servi sur l'ouverture d'un email.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

export const newsletterTrackingRoutes = new Hono();

// Pixel d'ouverture : l'URL se termine par .png pour les clients mail stricts.
newsletterTrackingRoutes.get('/open/:token', async (c) => {
  const raw = c.req.param('token');
  const token = raw.replace(/\.png$/i, '');
  // Le tracking ne doit jamais bloquer ni casser le rendu de l'email.
  try {
    await recordOpen(token);
  } catch {
    // Ignore : on renvoie le pixel quoi qu'il arrive.
  }
  return new Response(new Uint8Array(TRANSPARENT_PNG), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
});

function confirmationPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Desinscription — Neo Domotique</title>
  <style>
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f5f7fa; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#fff; border-radius:12px; box-shadow:0 1px 6px rgba(0,0,0,0.08); padding:40px; max-width:440px; text-align:center; }
    h1 { font-size:20px; color:#212529; margin:0 0 12px; }
    p { font-size:15px; color:#495057; line-height:1.6; margin:0; }
    .logo { font-size:13px; color:#6c757d; text-transform:uppercase; letter-spacing:1px; margin-bottom:20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Neo Domotique</div>
    <h1>${message}</h1>
    <p>Vous ne recevrez plus nos newsletters. Vous pouvez fermer cette page.</p>
  </div>
</body>
</html>`;
}

// Lien de desinscription : enregistre l'opt-out puis affiche une confirmation.
newsletterTrackingRoutes.get('/unsubscribe/:token', async (c) => {
  const token = c.req.param('token');
  let ok = false;
  try {
    ok = await recordUnsubscribe(token);
  } catch {
    ok = false;
  }
  const message = ok
    ? 'Vous etes bien desinscrit'
    : 'Lien de desinscription invalide';
  return c.html(confirmationPage(message), ok ? 200 : 404);
});
