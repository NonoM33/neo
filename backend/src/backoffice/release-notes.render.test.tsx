import { describe, expect, it } from 'bun:test';
import { ReleaseNotesPage } from './pages/newsletter/notes';
import type { AdminUser } from './middleware/admin-auth';
import type { ReleaseWithEntries } from '../modules/newsletter';

async function renderToString(node: unknown): Promise<string> {
  return (await (node as { toString(): Promise<string> }).toString()) as string;
}

const user: AdminUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'comm@neo.fr',
  firstName: 'Jean',
  lastName: 'Vendeur',
  role: 'admin',
  permissions: ['newsletter.manage'],
  isSuperAdmin: false,
};

function release(over: Partial<ReleaseWithEntries> = {}): ReleaseWithEntries {
  return {
    id: 'r1',
    version: '2026.06.05',
    title: 'Annonces Mattermost auto',
    description: 'Annonce auto à chaque publication.',
    status: 'publiee',
    releasedAt: new Date('2026-06-05T08:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-05T08:00:00Z'),
    entries: [
      {
        id: 'e1', releaseId: 'r1', title: 'Annonce Mattermost',
        description: 'Le canal release-notes est notifié.',
        category: 'nouveaute', isHighlight: true, sortOrder: 0,
        createdAt: new Date('2026-06-01T00:00:00Z'), updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
    ...over,
  };
}

describe('ReleaseNotesPage', () => {
  it('rend la timeline avec titre, version et nouveautés', async () => {
    const html = await renderToString(
      ReleaseNotesPage({ releases: [release()], user }) as unknown,
    );
    expect(html).toContain('Annonces Mattermost auto');
    expect(html).toContain('v2026.06.05');
    expect(html).toContain('Annonce Mattermost');
    expect(html).toContain('Dernière release');
    // Liens vers la gestion et le CHANGELOG.md téléchargeable.
    expect(html).toContain('/backoffice/newsletter/changelog.md');
    expect(html).toContain('/backoffice/newsletter');
  });

  it('affiche un état vide quand aucune release publiée', async () => {
    const html = await renderToString(
      ReleaseNotesPage({ releases: [], user }) as unknown,
    );
    expect(html).toContain('Aucune release publiée pour le moment');
  });
});
