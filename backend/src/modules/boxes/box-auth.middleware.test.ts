import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { errorHandler } from '../../middleware/error.middleware';
import type { Box } from '../../db/schema/boxes';
import { boxAuthMiddleware } from './box-auth.middleware';
import { generateBoxApiKey, hashSecret } from './boxes.domain';

function box(status: Box['status'], apiKeyHash: string): Box {
  return { id: 'b1', status, apiKeyHash } as unknown as Box;
}

function appWith(known: Box | null) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use('*', boxAuthMiddleware(async (hash) => (known && known.apiKeyHash === hash ? known : null)));
  app.get('/', (c) => c.json({ id: c.get('box').id }));
  return app;
}

describe('boxAuthMiddleware', () => {
  const key = generateBoxApiKey();

  it('refuse sans en-tete, avec un mauvais format, ou une cle inconnue', async () => {
    const app = appWith(box('enrolled', hashSecret(key)));
    expect((await app.request('/')).status).toBe(401);
    expect((await app.request('/', { headers: { Authorization: 'Bearer neo_sk_x' } })).status).toBe(401);
    const other = generateBoxApiKey();
    expect((await app.request('/', { headers: { Authorization: `Bearer ${other}` } })).status).toBe(401);
  });

  it('refuse une box revoquee meme avec la bonne cle', async () => {
    const app = appWith(box('revoked', hashSecret(key)));
    expect((await app.request('/', { headers: { Authorization: `Bearer ${key}` } })).status).toBe(401);
  });

  it('laisse passer une box enrolee et expose la box dans le contexte', async () => {
    const app = appWith(box('enrolled', hashSecret(key)));
    const res = await app.request('/', { headers: { Authorization: `Bearer ${key}` } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'b1' });
  });
});
