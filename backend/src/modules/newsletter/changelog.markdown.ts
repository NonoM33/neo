import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChangelogEntry } from '../../db/schema';
import type { ReleaseWithEntries } from './changelog.service';

// Sous-titre Markdown par categorie (emoji + libelle au pluriel).
const CATEGORY_HEADING: Record<ChangelogEntry['category'], string> = {
  nouveaute: '✨ Nouveautes',
  amelioration: '⬆️ Ameliorations',
  correction: '🔧 Corrections',
};

const CATEGORY_ORDER: ChangelogEntry['category'][] = [
  'nouveaute',
  'amelioration',
  'correction',
];

// Chemin du CHANGELOG.md a la racine du repo (4 niveaux au-dessus de ce module :
// newsletter -> modules -> src -> backend -> racine).
export const CHANGELOG_PATH = join(import.meta.dir, '../../../../CHANGELOG.md');

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function sortEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Rend l'intégralité du CHANGELOG.md (logique pure, testable) à partir des
 * releases fournies, dans l'ordre reçu (la plus récente en premier). La source
 * de vérité reste la base : ce fichier est régénéré à chaque publication.
 */
export function renderChangelogMarkdown(releases: ReleaseWithEntries[]): string {
  const lines: string[] = [
    '# Changelog',
    '',
    '> Généré automatiquement à chaque release publiée — ne pas éditer à la main.',
    '',
  ];

  if (releases.length === 0) {
    lines.push('_Aucune release publiée pour le moment._');
    lines.push('');
    return lines.join('\n');
  }

  for (const release of releases) {
    lines.push(`## v${release.version} — ${release.title}`);
    const date = release.releasedAt ?? release.createdAt;
    lines.push(`_${formatDate(date)}_`);
    lines.push('');
    if (release.description && release.description.trim()) {
      lines.push(release.description.trim());
      lines.push('');
    }

    for (const category of CATEGORY_ORDER) {
      const entries = sortEntries(
        release.entries.filter((e) => e.category === category),
      );
      if (entries.length === 0) continue;
      lines.push(`### ${CATEGORY_HEADING[category]}`);
      for (const entry of entries) {
        lines.push(`- **${entry.title}** — ${entry.description}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Régénère le CHANGELOG.md sur disque. Best-effort : en production (conteneur
 * sans le repo Git monté) l'écriture peut échouer sans conséquence — la source
 * de vérité reste la base. Retourne true si le fichier a été écrit.
 */
export async function writeChangelogFile(
  releases: ReleaseWithEntries[],
  targetPath: string = CHANGELOG_PATH,
): Promise<boolean> {
  try {
    await writeFile(targetPath, renderChangelogMarkdown(releases), 'utf8');
    return true;
  } catch (error) {
    console.error('[changelog] écriture CHANGELOG.md impossible:', error);
    return false;
  }
}
