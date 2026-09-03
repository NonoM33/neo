import { describe, expect, it } from 'bun:test';
import { BoxesListPage, BoxDetailPage } from './pages/boxes';
import type { AdminUser } from './middleware/admin-auth';
import type { BoxRow } from './pages/boxes/shared';

async function renderToString(node: unknown): Promise<string> {
  return (await (node as { toString(): Promise<string> }).toString()) as string;
}

const user: AdminUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'ops@neo.fr',
  firstName: 'Ops',
  lastName: 'Neo',
  role: 'admin',
  permissions: ['box.manage'],
  isSuperAdmin: false,
};

function box(over: Partial<BoxRow> = {}): BoxRow {
  return {
    id: 'b1',
    tokenSuffix: 'WC12',
    hardwareId: '10000000abcd',
    status: 'enrolled',
    clientId: 'c1',
    clientName: 'François Leroy',
    version: 'v0.1.0',
    errorCode: null,
    telemetry: { internet: 'up', home_assistant: 'running', zigbee_coordinator: 'up', zigbee_devices: 7 },
    ipAddress: '192.168.1.42',
    hostname: 'neo-box',
    zigbeeDevices: 7,
    lastSeenAt: new Date(),
    claimedAt: new Date('2026-09-03T10:00:00Z'),
    enrolledAt: new Date('2026-09-03T10:01:00Z'),
    revokedAt: null,
    createdAt: new Date('2026-09-03T09:59:00Z'),
    isOnline: true,
    ...over,
  };
}

const stats = { total: 1, unclaimed: 0, enrolled: 1, online: 1, openSupportRequests: 0 };

describe('BoxesListPage', () => {
  it('rend la flotte, le formulaire de rattachement et les clients', async () => {
    const html = await renderToString(
      BoxesListPage({
        boxes: [box()],
        stats,
        clients: [{ id: 'c1', firstName: 'François', lastName: 'Leroy' }],
        openRequests: [],
        user,
      }) as unknown,
    );
    expect(html).toContain('WC12');
    expect(html).toContain('François Leroy');
    expect(html).toContain('Enrolee');
    expect(html).toContain('En ligne');
    expect(html).toContain('/backoffice/boxes/claim');
    expect(html).toContain('Leroy François');
  });

  it('met en avant les demandes d\'assistance ouvertes et le code erreur', async () => {
    const b = box({ errorCode: 'E20' });
    const html = await renderToString(
      BoxesListPage({
        boxes: [b],
        stats: { ...stats, openSupportRequests: 1 },
        clients: [],
        openRequests: [{ id: 's1', boxId: 'b1', status: 'open', note: null, requestedAt: new Date(), closedAt: null, box: b, clientName: 'François Leroy' }],
        user,
      }) as unknown,
    );
    expect(html).toContain('Assistance a distance demandee');
    expect(html).toContain('/backoffice/boxes/support-requests/s1/close');
    expect(html).toContain('E20');
  });

  it('affiche un etat vide sans box', async () => {
    const html = await renderToString(
      BoxesListPage({ boxes: [], stats: { ...stats, total: 0 }, clients: [], openRequests: [], user }) as unknown,
    );
    expect(html).toContain('Aucune box ne s&#39;est encore annoncee');
  });
});

describe('BoxDetailPage', () => {
  it('rend la telemetrie et le bouton de revocation', async () => {
    const html = await renderToString(
      BoxDetailPage({ box: { ...box(), supportRequests: [] }, user }) as unknown,
    );
    expect(html).toContain('Home Assistant');
    expect(html).toContain('192.168.1.42');
    expect(html).toContain('/backoffice/boxes/b1/revoke');
  });

  it("ne propose pas de revoquer une box deja revoquee", async () => {
    const html = await renderToString(
      BoxDetailPage({ box: { ...box({ status: 'revoked' }), supportRequests: [] }, user }) as unknown,
    );
    expect(html).not.toContain('/backoffice/boxes/b1/revoke');
    expect(html).toContain('Revoquee');
  });
});
