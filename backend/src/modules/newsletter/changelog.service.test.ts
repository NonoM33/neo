import { describe, expect, it } from 'bun:test';
import { groupSelectedEntriesByRelease } from './changelog.service';
import type { Release, ChangelogEntry } from '../../db/schema';

function makeRelease(id: string, version: string, createdAt: string): Release {
  return {
    id,
    version,
    title: `Version ${version}`,
    description: null,
    status: 'brouillon',
    releasedAt: null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  };
}

function makeEntry(
  id: string,
  releaseId: string,
  overrides: Partial<ChangelogEntry> = {}
): ChangelogEntry {
  return {
    id,
    releaseId,
    title: `Entree ${id}`,
    description: 'Description',
    category: 'nouveaute',
    isHighlight: false,
    sortOrder: 0,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('groupSelectedEntriesByRelease', () => {
  it('ne garde que les entrees cochees, groupees par release', () => {
    const releases = [
      makeRelease('r1', '1.0.0', '2026-06-01T00:00:00Z'),
      makeRelease('r2', '1.1.0', '2026-06-02T00:00:00Z'),
    ];
    const entries = [
      makeEntry('e1', 'r1'),
      makeEntry('e2', 'r1'),
      makeEntry('e3', 'r2'),
    ];

    const result = groupSelectedEntriesByRelease(releases, entries, ['e1', 'e3']);

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('r1');
    expect(result[0]!.entries.map((e) => e.id)).toEqual(['e1']);
    expect(result[1]!.id).toBe('r2');
    expect(result[1]!.entries.map((e) => e.id)).toEqual(['e3']);
  });

  it('exclut les releases qui n ont aucune entree cochee', () => {
    const releases = [
      makeRelease('r1', '1.0.0', '2026-06-01T00:00:00Z'),
      makeRelease('r2', '1.1.0', '2026-06-02T00:00:00Z'),
    ];
    const entries = [makeEntry('e1', 'r1'), makeEntry('e2', 'r2')];

    const result = groupSelectedEntriesByRelease(releases, entries, ['e1']);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('r1');
  });

  it('met les entrees mises en avant (highlight) en premier', () => {
    const releases = [makeRelease('r1', '1.0.0', '2026-06-01T00:00:00Z')];
    const entries = [
      makeEntry('e1', 'r1', { sortOrder: 0, isHighlight: false }),
      makeEntry('e2', 'r1', { sortOrder: 5, isHighlight: true }),
    ];

    const result = groupSelectedEntriesByRelease(releases, entries, ['e1', 'e2']);

    expect(result[0]!.entries.map((e) => e.id)).toEqual(['e2', 'e1']);
  });

  it('trie par sortOrder puis date a highlight egal', () => {
    const releases = [makeRelease('r1', '1.0.0', '2026-06-01T00:00:00Z')];
    const entries = [
      makeEntry('e1', 'r1', { sortOrder: 2 }),
      makeEntry('e2', 'r1', { sortOrder: 1 }),
      makeEntry('e3', 'r1', {
        sortOrder: 1,
        createdAt: new Date('2026-06-03T00:00:00Z'),
      }),
    ];

    const result = groupSelectedEntriesByRelease(
      releases,
      entries,
      ['e1', 'e2', 'e3']
    );

    // sortOrder 1 (e2 avant e3 par date), puis sortOrder 2 (e1)
    expect(result[0]!.entries.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
  });

  it('retourne un tableau vide si rien n est coche', () => {
    const releases = [makeRelease('r1', '1.0.0', '2026-06-01T00:00:00Z')];
    const entries = [makeEntry('e1', 'r1')];

    expect(groupSelectedEntriesByRelease(releases, entries, [])).toEqual([]);
  });

  it('ignore les ids coches inconnus', () => {
    const releases = [makeRelease('r1', '1.0.0', '2026-06-01T00:00:00Z')];
    const entries = [makeEntry('e1', 'r1')];

    const result = groupSelectedEntriesByRelease(releases, entries, [
      'e1',
      'inconnu',
    ]);

    expect(result[0]!.entries.map((e) => e.id)).toEqual(['e1']);
  });
});
