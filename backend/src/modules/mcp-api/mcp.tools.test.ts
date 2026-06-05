import { describe, expect, it } from 'bun:test';
import { executeTool, getToolDefinitions, type ApiFetcher } from './mcp.tools';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface Recorded {
  url: string;
  init?: RequestInit;
}

function recordingFetcher(response: Response): { fetcher: ApiFetcher; calls: Recorded[] } {
  const calls: Recorded[] = [];
  return {
    calls,
    fetcher: {
      async request(url, init) {
        calls.push({ url, init });
        return response;
      },
    },
  };
}

const ctxBase = { authorization: 'Bearer neo_sk_test' };

describe('getToolDefinitions', () => {
  it('expose list_endpoints et api_request', () => {
    const names = getToolDefinitions().map((t) => t.name);
    expect(names).toContain('list_endpoints');
    expect(names).toContain('api_request');
  });
});

describe('list_endpoints', () => {
  it('renvoie le catalogue et la liste des ressources', async () => {
    const res = await executeTool('list_endpoints', {}, { ...ctxBase, fetcher: { request: async () => new Response() } });
    const payload = JSON.parse(res.content[0]!.text);
    expect(payload.count).toBeGreaterThan(0);
    expect(payload.resources).toContain('projets');
  });

  it('filtre par ressource', async () => {
    const res = await executeTool(
      'list_endpoints',
      { resource: 'users' },
      { ...ctxBase, fetcher: { request: async () => new Response() } }
    );
    const payload = JSON.parse(res.content[0]!.text);
    expect(payload.endpoints.every((e: any) => e.resource === 'users')).toBe(true);
  });
});

describe('api_request', () => {
  it('forwarde la requête avec le bearer et parse le corps JSON', async () => {
    const { fetcher, calls } = recordingFetcher(jsonResponse(200, { items: [] }));
    const res = await executeTool('api_request', { method: 'GET', path: '/api/projets' }, { ...ctxBase, fetcher });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('/api/projets');
    expect((calls[0]!.init!.headers as Record<string, string>).Authorization).toBe('Bearer neo_sk_test');

    const summary = JSON.parse(res.content[0]!.text);
    expect(summary.status).toBe(200);
    expect(summary.ok).toBe(true);
    expect(summary.body).toEqual({ items: [] });
    expect(res.isError).toBe(false);
  });

  it('encode les paramètres de requête', async () => {
    const { fetcher, calls } = recordingFetcher(jsonResponse(200, {}));
    await executeTool(
      'api_request',
      { method: 'GET', path: '/api/leads', query: { page: '2', status: 'gagne' } },
      { ...ctxBase, fetcher }
    );
    expect(calls[0]!.url).toBe('/api/leads?page=2&status=gagne');
  });

  it('sérialise le corps JSON et pose le Content-Type pour POST', async () => {
    const { fetcher, calls } = recordingFetcher(jsonResponse(201, { id: 'x' }));
    await executeTool(
      'api_request',
      { method: 'POST', path: '/api/leads', body: { nom: 'Test' } },
      { ...ctxBase, fetcher }
    );
    const init = calls[0]!.init!;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ nom: 'Test' }));
  });

  it('marque isError quand la réponse est >= 400', async () => {
    const { fetcher } = recordingFetcher(jsonResponse(403, { error: 'Forbidden' }));
    const res = await executeTool('api_request', { method: 'GET', path: '/api/users' }, { ...ctxBase, fetcher });
    expect(res.isError).toBe(true);
    expect(JSON.parse(res.content[0]!.text).status).toBe(403);
  });

  it('refuse une méthode invalide sans appeler le fetcher', async () => {
    const { fetcher, calls } = recordingFetcher(jsonResponse(200, {}));
    const res = await executeTool('api_request', { method: 'CONNECT', path: '/api/x' }, { ...ctxBase, fetcher });
    expect(res.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('refuse un chemin hors /api', async () => {
    const { fetcher, calls } = recordingFetcher(jsonResponse(200, {}));
    const res = await executeTool('api_request', { method: 'GET', path: '/backoffice/users' }, { ...ctxBase, fetcher });
    expect(res.isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe('executeTool — outil inconnu', () => {
  it('renvoie une erreur', async () => {
    const res = await executeTool('nope', {}, { ...ctxBase, fetcher: { request: async () => new Response() } });
    expect(res.isError).toBe(true);
  });
});
