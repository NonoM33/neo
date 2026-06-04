import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { relaxWidgetCorp } from './widget-corp.middleware';

// Régression : sur stg, le bouton flottant de feedback n'apparaissait jamais
// sur le site vitrine / CRM. Cause = le script `/feedback-widget.js`, chargé en
// cross-origin, était servi avec `Cross-Origin-Resource-Policy: same-origin`
// (posé par secureHeaders), donc bloqué par le navigateur
// (net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin).
//
// On reproduit l'empilement réel des middlewares (relaxWidgetCorp AVANT
// secureHeaders, comme dans app.ts) pour garantir que l'override survit bien à
// secureHeaders.
function buildApp() {
  const app = new Hono();
  app.use('*', relaxWidgetCorp);
  app.use('*', secureHeaders());
  app.get('/feedback-widget.js', (c) => c.text('// widget'));
  app.get('/chatbot-widget.js', (c) => c.text('// chatbot'));
  app.get('/api/health', (c) => c.json({ ok: true }));
  return app;
}

describe('relaxWidgetCorp — CORP des widgets embarquables', () => {
  it('sert /feedback-widget.js en Cross-Origin-Resource-Policy: cross-origin', async () => {
    const res = await buildApp().request('/feedback-widget.js');
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
  });

  it('applique aussi le CORP cross-origin au chatbot embarquable', async () => {
    const res = await buildApp().request('/chatbot-widget.js');
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
  });

  it('laisse les autres routes en same-origin (sécurité par défaut)', async () => {
    const res = await buildApp().request('/api/health');
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
  });
});
