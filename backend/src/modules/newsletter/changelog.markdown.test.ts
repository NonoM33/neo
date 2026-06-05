import { describe, expect, it } from 'bun:test';
import { renderChangelogMarkdown } from './changelog.markdown';
import type { ReleaseWithEntries } from './changelog.service';

function release(over: Partial<ReleaseWithEntries> = {}): ReleaseWithEntries {
  return {
    id: 'r1',
    version: '2026.06.05',
    title: 'Notes de version',
    description: 'Première release documentée.',
    status: 'publiee',
    releasedAt: new Date('2026-06-05T08:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-05T08:00:00Z'),
    entries: [
      {
        id: 'e1',
        releaseId: 'r1',
        title: 'Annonce Mattermost',
        description: 'Le canal release-notes est notifié.',
        category: 'nouveaute',
        isHighlight: true,
        sortOrder: 0,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
      {
        id: 'e2',
        releaseId: 'r1',
        title: 'Correction QR',
        description: 'Le lien de reprise est réparé.',
        category: 'correction',
        isHighlight: false,
        sortOrder: 1,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
    ...over,
  };
}

describe('renderChangelogMarkdown', () => {
  it('produit un titre de document Changelog', () => {
    const md = renderChangelogMarkdown([release()]);
    expect(md).toContain('# Changelog');
  });

  it('rend une section par release avec version et titre', () => {
    const md = renderChangelogMarkdown([release()]);
    expect(md).toContain('## v2026.06.05 — Notes de version');
  });

  it('regroupe les entrees par categorie sous des sous-titres', () => {
    const md = renderChangelogMarkdown([release()]);
    expect(md).toContain('### ✨ Nouveautes');
    expect(md).toContain('### 🔧 Corrections');
    expect(md).toContain('- **Annonce Mattermost** — Le canal release-notes est notifié.');
    expect(md).toContain('- **Correction QR** — Le lien de reprise est réparé.');
  });

  it('omet une categorie sans entree', () => {
    const md = renderChangelogMarkdown([release()]);
    expect(md).not.toContain('### ⬆️ Amelioration');
  });

  it('inclut la description de la release quand elle est présente', () => {
    const md = renderChangelogMarkdown([release()]);
    expect(md).toContain('Première release documentée.');
  });

  it('affiche la date de publication (année)', () => {
    const md = renderChangelogMarkdown([release()]);
    expect(md).toContain('2026');
  });

  it('ordonne les releases telles que fournies (plus récente en premier)', () => {
    const recent = release({ id: 'r2', version: '2026.07.01', title: 'Récente' });
    const old = release({ id: 'r1', version: '2026.06.05', title: 'Ancienne' });
    const md = renderChangelogMarkdown([recent, old]);
    expect(md.indexOf('Récente')).toBeLessThan(md.indexOf('Ancienne'));
  });

  it('gère le cas sans aucune release', () => {
    const md = renderChangelogMarkdown([]);
    expect(md).toContain('# Changelog');
    expect(md).toContain('Aucune release publiée');
  });
});
