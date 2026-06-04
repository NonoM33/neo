import { describe, expect, it } from 'bun:test';
import {
  buildPromptPayload,
  parseAiResponse,
} from './email.ai.service';
import type { ReleaseWithEntries } from './changelog.service';

const grouped: ReleaseWithEntries[] = [
  {
    id: 'r1',
    version: '2.0.0',
    title: 'Refonte',
    description: null,
    status: 'publiee',
    releasedAt: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    entries: [
      {
        id: 'e1',
        releaseId: 'r1',
        title: 'Dashboard',
        description: 'Nouveau dashboard',
        category: 'nouveaute',
        isHighlight: true,
        sortOrder: 0,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        updatedAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
  },
];

describe('buildPromptPayload', () => {
  it('liste les releases, versions, categories et highlights', () => {
    const payload = buildPromptPayload(grouped);
    expect(payload).toContain('Refonte');
    expect(payload).toContain('version 2.0.0');
    expect(payload).toContain('Dashboard');
    expect(payload).toContain('A METTRE EN AVANT');
    expect(payload).toContain('Nouveaute');
  });
});

describe('parseAiResponse', () => {
  it('parse un JSON propre', () => {
    const out = parseAiResponse('{"subject":"Salut","bodyHtml":"<p>Hi</p>"}');
    expect(out).toEqual({ subject: 'Salut', bodyHtml: '<p>Hi</p>' });
  });

  it('parse du JSON entoure de texte ou de balises de code', () => {
    const raw = 'Voici:\n```json\n{"subject":"S","bodyHtml":"<p>B</p>"}\n```\nVoila';
    expect(parseAiResponse(raw)).toEqual({ subject: 'S', bodyHtml: '<p>B</p>' });
  });

  it('renvoie null si subject ou bodyHtml manque', () => {
    expect(parseAiResponse('{"subject":"S"}')).toBeNull();
    expect(parseAiResponse('{"bodyHtml":"<p>B</p>"}')).toBeNull();
  });

  it('renvoie null sur champ vide', () => {
    expect(parseAiResponse('{"subject":"  ","bodyHtml":"<p>B</p>"}')).toBeNull();
  });

  it('renvoie null sur texte non-JSON', () => {
    expect(parseAiResponse('pas de json ici')).toBeNull();
  });
});
