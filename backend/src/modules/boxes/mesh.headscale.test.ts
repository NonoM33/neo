import { describe, expect, it } from 'bun:test';
import { HeadscaleError, HeadscaleMeshProvider } from './mesh.headscale';
import { meshHostname } from './mesh.port';

// Ecrit depuis le contrat REST de headscale v0.26 (proto headscale.proto,
// preauthkey.proto, node.proto), pas depuis le fournisseur.
interface Call { method: string; url: string; body: unknown; auth: string | undefined }

function fakeHeadscale(routes: Record<string, (call: Call) => [number, unknown]>) {
  const calls: Call[] = [];
  const fetchFn = async (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = {
      method: init?.method ?? 'GET',
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: headers.Authorization,
    };
    calls.push(call);
    const key = `${call.method} ${new URL(url).pathname}`;
    const handler = routes[key];
    const [status, payload] = handler ? handler(call) : [404, { message: 'no route' }];
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return { calls, fetchFn };
}

const now = () => new Date('2026-09-03T12:00:00Z');

describe('meshHostname', () => {
  it('derive un nom stable et court de l identifiant de la box', () => {
    expect(meshHostname('1a2b3512-33d7-412c-aced-8c8cdb12fbbb')).toBe('neo-box-1a2b351233d7');
  });
});

describe('HeadscaleMeshProvider.enrollBox', () => {
  it('cree l utilisateur puis une cle pre-auth a usage unique taguee tag:box, valable 7 jours', async () => {
    const hs = fakeHeadscale({
      'GET /api/v1/user': () => [200, { users: [] }],
      'POST /api/v1/user': (c) => [200, { user: { id: '7', name: (c.body as { name: string }).name } }],
      'POST /api/v1/preauthkey': () => [200, { preAuthKey: { key: 'hskey_abc', user: { id: '7' } } }],
    });
    const provider = new HeadscaleMeshProvider('https://mesh.example/', 'apikey', hs.fetchFn, now);

    const enrollment = await provider.enrollBox('neo-box-1a2b351233d7');

    expect(enrollment).toEqual({
      loginServer: 'https://mesh.example/',
      authKey: 'hskey_abc',
      hostname: 'neo-box-1a2b351233d7',
    });
    const createUser = hs.calls.find((c) => c.method === 'POST' && c.url.endsWith('/api/v1/user'));
    expect(createUser?.body).toEqual({ name: 'neo-box-1a2b351233d7' });
    expect(createUser?.auth).toBe('Bearer apikey');
    const createKey = hs.calls.find((c) => c.url.endsWith('/api/v1/preauthkey'));
    expect(createKey?.body).toEqual({
      user: '7',
      reusable: false,
      ephemeral: false,
      expiration: '2026-09-10T12:00:00.000Z',
      aclTags: ['tag:box'],
    });
  });

  it('reutilise l utilisateur s il existe deja', async () => {
    const hs = fakeHeadscale({
      'GET /api/v1/user': () => [200, { users: [{ id: '3', name: 'neo-box-x' }] }],
      'POST /api/v1/preauthkey': () => [200, { preAuthKey: { key: 'k' } }],
    });
    await new HeadscaleMeshProvider('https://mesh.example', 'a', hs.fetchFn, now).enrollBox('neo-box-x');
    expect(hs.calls.some((c) => c.method === 'POST' && c.url.endsWith('/api/v1/user'))).toBe(false);
    expect(hs.calls.find((c) => c.url.endsWith('/preauthkey'))?.body).toMatchObject({ user: '3' });
  });

  it('remonte une erreur typee quand headscale refuse', async () => {
    const hs = fakeHeadscale({ 'GET /api/v1/user': () => [401, { message: 'Unauthorized' }] });
    const provider = new HeadscaleMeshProvider('https://mesh.example', 'bad', hs.fetchFn, now);
    await expect(provider.enrollBox('neo-box-x')).rejects.toBeInstanceOf(HeadscaleError);
  });
});

describe('HeadscaleMeshProvider.findBoxNode', () => {
  it('rend l adresse IPv4 du noeud de l utilisateur de la box', async () => {
    const hs = fakeHeadscale({
      'GET /api/v1/node': (c) => {
        expect(new URL(c.url).searchParams.get('user')).toBe('neo-box-x');
        return [200, {
          nodes: [{ ipAddresses: ['fd7a:115c:a1e0::1', '100.64.0.5'], givenName: 'neo-box-x', online: true, lastSeen: '2026-09-03T11:59:00Z' }],
        }];
      },
    });
    const node = await new HeadscaleMeshProvider('https://mesh.example', 'a', hs.fetchFn, now).findBoxNode('neo-box-x');
    expect(node).toEqual({ ip: '100.64.0.5', online: true, lastSeen: new Date('2026-09-03T11:59:00Z') });
  });

  it('prefere le noeud en ligne quand la box a ete reenrolee', async () => {
    const hs = fakeHeadscale({
      'GET /api/v1/node': () => [200, {
        nodes: [
          { ipAddresses: ['100.64.0.1'], givenName: 'neo-box-x', online: false, lastSeen: '2026-09-03T11:00:00Z' },
          { ipAddresses: ['100.64.0.3'], givenName: 'neo-box-x-1', online: true, lastSeen: '2026-09-03T11:59:00Z' },
        ],
      }],
    });
    const node = await new HeadscaleMeshProvider('https://mesh.example', 'a', hs.fetchFn, now).findBoxNode('neo-box-x');
    expect(node?.ip).toBe('100.64.0.3');
  });

  it('sinon le plus recemment vu', async () => {
    const hs = fakeHeadscale({
      'GET /api/v1/node': () => [200, {
        nodes: [
          { ipAddresses: ['100.64.0.1'], givenName: 'a', online: false, lastSeen: '2026-09-03T11:00:00Z' },
          { ipAddresses: ['100.64.0.3'], givenName: 'b', online: false, lastSeen: '2026-09-03T11:30:00Z' },
        ],
      }],
    });
    const node = await new HeadscaleMeshProvider('https://mesh.example', 'a', hs.fetchFn, now).findBoxNode('neo-box-x');
    expect(node?.ip).toBe('100.64.0.3');
  });

  it('rend null si la box n a jamais rejoint le mesh', async () => {
    const hs = fakeHeadscale({ 'GET /api/v1/node': () => [200, { nodes: [] }] });
    expect(await new HeadscaleMeshProvider('https://mesh.example', 'a', hs.fetchFn, now).findBoxNode('neo-box-x')).toBeNull();
  });
});
