import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  releases,
  changelogEntries,
  type Release,
  type ChangelogEntry,
} from '../../db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReleaseWithEntries extends Release {
  entries: ChangelogEntry[];
}

export interface CreateReleaseInput {
  version: string;
  title: string;
  description?: string | null;
}

export interface UpdateReleaseInput {
  version?: string;
  title?: string;
  description?: string | null;
  status?: Release['status'];
}

export interface CreateEntryInput {
  releaseId: string;
  title: string;
  description: string;
  category?: ChangelogEntry['category'];
  isHighlight?: boolean;
  sortOrder?: number;
}

export interface UpdateEntryInput {
  title?: string;
  description?: string;
  category?: ChangelogEntry['category'];
  isHighlight?: boolean;
  sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Logique pure (testable sans base) : regroupement des entrees cochees par
// release, dans l'ordre des releases puis des entrees. Sert a composer l'email.
// ---------------------------------------------------------------------------

export function groupSelectedEntriesByRelease(
  releaseList: Release[],
  entries: ChangelogEntry[],
  selectedEntryIds: string[]
): ReleaseWithEntries[] {
  const selected = new Set(selectedEntryIds);
  const keptEntries = entries.filter((e) => selected.has(e.id));

  const entriesByRelease = new Map<string, ChangelogEntry[]>();
  for (const entry of keptEntries) {
    const list = entriesByRelease.get(entry.releaseId) ?? [];
    list.push(entry);
    entriesByRelease.set(entry.releaseId, list);
  }

  // Tri stable des entrees au sein d'une release : highlight d'abord, puis
  // sortOrder croissant, puis date de creation.
  for (const list of entriesByRelease.values()) {
    list.sort((a, b) => {
      if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  return releaseList
    .map((release) => ({
      ...release,
      entries: entriesByRelease.get(release.id) ?? [],
    }))
    .filter((r) => r.entries.length > 0);
}

// ---------------------------------------------------------------------------
// CRUD Releases
// ---------------------------------------------------------------------------

export async function listReleasesWithEntries(): Promise<ReleaseWithEntries[]> {
  const releaseList = await db
    .select()
    .from(releases)
    .orderBy(desc(releases.createdAt));

  if (releaseList.length === 0) return [];

  const releaseIds = releaseList.map((r) => r.id);
  const entries = await db
    .select()
    .from(changelogEntries)
    .where(inArray(changelogEntries.releaseId, releaseIds))
    .orderBy(asc(changelogEntries.sortOrder));

  const entriesByRelease = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = entriesByRelease.get(entry.releaseId) ?? [];
    list.push(entry);
    entriesByRelease.set(entry.releaseId, list);
  }

  return releaseList.map((release) => ({
    ...release,
    entries: entriesByRelease.get(release.id) ?? [],
  }));
}

export async function getReleaseWithEntries(
  releaseId: string
): Promise<ReleaseWithEntries | undefined> {
  const [release] = await db
    .select()
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1);
  if (!release) return undefined;

  const entries = await db
    .select()
    .from(changelogEntries)
    .where(eq(changelogEntries.releaseId, releaseId))
    .orderBy(asc(changelogEntries.sortOrder));

  return { ...release, entries };
}

export async function createRelease(
  input: CreateReleaseInput
): Promise<Release> {
  const [created] = await db
    .insert(releases)
    .values({
      version: input.version,
      title: input.title,
      description: input.description ?? null,
    })
    .returning();
  return created!;
}

export async function updateRelease(
  releaseId: string,
  input: UpdateReleaseInput
): Promise<void> {
  await db
    .update(releases)
    .set({
      ...input,
      releasedAt:
        input.status === 'publiee' ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(releases.id, releaseId));
}

export async function deleteRelease(releaseId: string): Promise<void> {
  await db.delete(releases).where(eq(releases.id, releaseId));
}

// ---------------------------------------------------------------------------
// CRUD Entrees de changelog
// ---------------------------------------------------------------------------

export async function createEntry(
  input: CreateEntryInput
): Promise<ChangelogEntry> {
  const [created] = await db
    .insert(changelogEntries)
    .values({
      releaseId: input.releaseId,
      title: input.title,
      description: input.description,
      category: input.category ?? 'nouveaute',
      isHighlight: input.isHighlight ?? false,
      sortOrder: input.sortOrder ?? 0,
    })
    .returning();
  return created!;
}

export async function updateEntry(
  entryId: string,
  input: UpdateEntryInput
): Promise<void> {
  await db
    .update(changelogEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(changelogEntries.id, entryId));
}

export async function deleteEntry(entryId: string): Promise<void> {
  await db.delete(changelogEntries).where(eq(changelogEntries.id, entryId));
}

export async function getEntriesByIds(
  ids: string[]
): Promise<ChangelogEntry[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(changelogEntries)
    .where(inArray(changelogEntries.id, ids))
    .orderBy(asc(changelogEntries.sortOrder));
}

// Entrees non encore incluses dans une campagne envoyee : utile pour
// pre-cocher "les nouveautes" dans l'interface admin.
export async function getReleasesByIds(ids: string[]): Promise<Release[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(releases)
    .where(inArray(releases.id, ids))
    .orderBy(desc(releases.createdAt));
}

// Toutes les entrees d'un ensemble de releases (pour reconstruire la vue
// groupee a partir d'ids selectionnes).
export async function getEntriesForReleases(
  releaseIds: string[]
): Promise<ChangelogEntry[]> {
  if (releaseIds.length === 0) return [];
  return db
    .select()
    .from(changelogEntries)
    .where(inArray(changelogEntries.releaseId, releaseIds))
    .orderBy(asc(changelogEntries.sortOrder));
}

export async function searchEntries(
  filters: { category?: ChangelogEntry['category']; releaseId?: string } = {}
): Promise<ChangelogEntry[]> {
  const conditions = [
    filters.category
      ? eq(changelogEntries.category, filters.category)
      : undefined,
    filters.releaseId
      ? eq(changelogEntries.releaseId, filters.releaseId)
      : undefined,
  ].filter(Boolean);

  return db
    .select()
    .from(changelogEntries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(changelogEntries.sortOrder));
}
