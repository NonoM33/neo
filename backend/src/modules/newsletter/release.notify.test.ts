import { describe, expect, it } from 'bun:test';
import { buildReleaseMattermostMessage } from './release.notify';
import type { ReleaseWithEntries } from './changelog.service';

function release(over: Partial<ReleaseWithEntries> = {}): ReleaseWithEntries {
  const base: ReleaseWithEntries = {
    id: 'r1',
    version: '2026.06.05',
    title: 'Notes de version & annonces Mattermost',
    description: 'Chaque release est annoncee automatiquement.',
    status: 'publiee',
    releasedAt: new Date('2026-06-05T08:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-05T08:00:00Z'),
    entries: [
      {
        id: 'e1',
        releaseId: 'r1',
        title: 'Annonce auto sur Mattermost',
        description: 'A la publication, le canal release-notes recoit le detail.',
        category: 'nouveaute',
        isHighlight: true,
        sortOrder: 0,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
      {
        id: 'e2',
        releaseId: 'r1',
        title: 'CHANGELOG.md toujours a jour',
        description: 'Le fichier est regenere a chaque publication.',
        category: 'amelioration',
        isHighlight: false,
        sortOrder: 1,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
      {
        id: 'e3',
        releaseId: 'r1',
        title: 'Lien de reprise corrige',
        description: 'Le QR code pointait vers une route obsolete.',
        category: 'correction',
        isHighlight: false,
        sortOrder: 2,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
    ...over,
  };
  return base;
}

describe('buildReleaseMattermostMessage', () => {
  it('annonce le titre et la version de la release', () => {
    const msg = buildReleaseMattermostMessage(release());
    expect(msg).toContain('Notes de version & annonces Mattermost');
    expect(msg).toContain('2026.06.05');
    expect(msg).toContain('🚀');
  });

  it('regroupe les entrees par categorie avec leur libelle et emoji', () => {
    const msg = buildReleaseMattermostMessage(release());
    expect(msg).toContain('Nouveaute');
    expect(msg).toContain('Amelioration');
    expect(msg).toContain('Correction');
    expect(msg).toContain('✨');
    expect(msg).toContain('⬆️');
    expect(msg).toContain('🔧');
  });

  it('detaille chaque nouveaute (titre + description)', () => {
    const msg = buildReleaseMattermostMessage(release());
    expect(msg).toContain('Annonce auto sur Mattermost');
    expect(msg).toContain('A la publication, le canal release-notes recoit le detail.');
    expect(msg).toContain('CHANGELOG.md toujours a jour');
    expect(msg).toContain('Lien de reprise corrige');
  });

  it('met en avant les entrees a la une (highlight) en premier de leur categorie', () => {
    const r = release({
      entries: [
        {
          ...release().entries[1]!,
          isHighlight: false,
          sortOrder: 0,
          title: 'Entree normale',
        },
        {
          ...release().entries[0]!,
          category: 'amelioration',
          isHighlight: true,
          sortOrder: 5,
          title: 'Entree a la une',
        },
      ],
    });
    const msg = buildReleaseMattermostMessage(r);
    expect(msg.indexOf('Entree a la une')).toBeLessThan(msg.indexOf('Entree normale'));
  });

  it('inclut la description de la release quand elle est presente', () => {
    const msg = buildReleaseMattermostMessage(release());
    expect(msg).toContain('Chaque release est annoncee automatiquement.');
  });

  it('omet la ligne de description quand elle est absente', () => {
    const msg = buildReleaseMattermostMessage(release({ description: null }));
    expect(msg).not.toContain('Chaque release est annoncee automatiquement.');
  });

  it('pointe vers la page des notes de version sur la base URL fournie', () => {
    const msg = buildReleaseMattermostMessage(
      release(),
      'https://stg.api.neo-domotique.fr',
    );
    expect(msg).toContain(
      '(https://stg.api.neo-domotique.fr/backoffice/release-notes)',
    );
    // Regression : jamais le domaine interne sslip.io (injoignable de l'exterieur).
    expect(msg).not.toContain('sslip.io');
  });

  it('normalise le slash final de la base URL (pas de double slash)', () => {
    const msg = buildReleaseMattermostMessage(release(), 'https://x.fr/');
    expect(msg).toContain('(https://x.fr/backoffice/release-notes)');
    expect(msg).not.toContain('//backoffice');
  });

  it('reste robuste si la release ne contient aucune entree', () => {
    const msg = buildReleaseMattermostMessage(release({ entries: [] }));
    expect(msg).toContain('2026.06.05');
    expect(msg).not.toContain('✨');
  });
});
