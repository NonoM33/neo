import { describe, expect, it } from 'bun:test';
import { newsletterTrackingRoutes } from './tracking.routes';

// Le tracking ne doit JAMAIS casser : meme si l'enregistrement en base echoue
// (pas de DB en test), le pixel doit toujours etre servi pour ne pas degrader
// le rendu de l'email cote client.
describe('newsletterTrackingRoutes — pixel d ouverture', () => {
  it('sert un PNG 200 meme sur token inconnu / DB indisponible', async () => {
    const res = await newsletterTrackingRoutes.request('/open/tokeninconnu.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('ne met pas en cache le pixel (compteur d ouvertures fiable)', async () => {
    const res = await newsletterTrackingRoutes.request('/open/x.png');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
});

describe('newsletterTrackingRoutes — desinscription', () => {
  it('renvoie une page 404 lisible sur token invalide', async () => {
    const res = await newsletterTrackingRoutes.request('/unsubscribe/inconnu');
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('invalide');
  });
});
