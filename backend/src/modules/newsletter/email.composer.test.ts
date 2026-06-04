import { describe, expect, it } from 'bun:test';
import {
  buildCampaignHtml,
  personalizeHtml,
  renderBodyFromReleases,
  renderTextFromReleases,
  TRACKING_PIXEL_PLACEHOLDER,
  UNSUBSCRIBE_URL_PLACEHOLDER,
} from './email.composer';
import type { ReleaseWithEntries } from './changelog.service';

const grouped: ReleaseWithEntries[] = [
  {
    id: 'r1',
    version: '2.0.0',
    title: 'Refonte majeure',
    description: null,
    status: 'publiee',
    releasedAt: new Date('2026-06-01T00:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    entries: [
      {
        id: 'e1',
        releaseId: 'r1',
        title: 'Nouveau tableau de bord',
        description: 'Un dashboard repense.',
        category: 'nouveaute',
        isHighlight: true,
        sortOrder: 0,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
  },
];

describe('renderBodyFromReleases', () => {
  it('rend le titre de release, la version et les entrees', () => {
    const html = renderBodyFromReleases(grouped);
    expect(html).toContain('Refonte majeure');
    expect(html).toContain('Version 2.0.0');
    expect(html).toContain('Nouveau tableau de bord');
    expect(html).toContain('Un dashboard repense.');
  });

  it('echappe le HTML pour eviter toute injection', () => {
    const malicious: ReleaseWithEntries[] = [
      {
        ...grouped[0]!,
        entries: [
          {
            ...grouped[0]!.entries[0]!,
            title: '<script>alert(1)</script>',
          },
        ],
      },
    ];
    const html = renderBodyFromReleases(malicious);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('gere le cas sans nouveaute', () => {
    expect(renderBodyFromReleases([])).toContain('Aucune nouveaute');
  });
});

describe('buildCampaignHtml', () => {
  it('insere le corps et les deux placeholders', () => {
    const html = buildCampaignHtml('Sujet test', '<p>corps</p>');
    expect(html).toContain('<p>corps</p>');
    expect(html).toContain(TRACKING_PIXEL_PLACEHOLDER);
    expect(html).toContain(UNSUBSCRIBE_URL_PLACEHOLDER);
    expect(html).toContain('Neo Domotique');
  });
});

describe('personalizeHtml', () => {
  it('remplace le pixel et le lien de desinscription par destinataire', () => {
    const campaign = buildCampaignHtml('Sujet', '<p>corps</p>');
    const personalized = personalizeHtml(campaign, {
      pixelUrl: 'https://app/track/open/tok123',
      unsubscribeUrl: 'https://app/track/unsub/tok123',
    });

    expect(personalized).not.toContain(TRACKING_PIXEL_PLACEHOLDER);
    expect(personalized).not.toContain(UNSUBSCRIBE_URL_PLACEHOLDER);
    expect(personalized).toContain('https://app/track/open/tok123');
    expect(personalized).toContain('href="https://app/track/unsub/tok123"');
    expect(personalized).toContain('width="1" height="1"');
  });

  it('remplace toutes les occurrences (placeholder present plusieurs fois)', () => {
    const html = `${UNSUBSCRIBE_URL_PLACEHOLDER} milieu ${UNSUBSCRIBE_URL_PLACEHOLDER}`;
    const out = personalizeHtml(html, {
      pixelUrl: 'p',
      unsubscribeUrl: 'U',
    });
    expect(out).toBe('U milieu U');
  });
});

describe('renderTextFromReleases', () => {
  it('produit une version texte avec le lien de desinscription', () => {
    const text = renderTextFromReleases(grouped, 'https://app/unsub/x');
    expect(text).toContain('Refonte majeure');
    expect(text).toContain('Nouveau tableau de bord');
    expect(text).toContain('https://app/unsub/x');
  });
});
