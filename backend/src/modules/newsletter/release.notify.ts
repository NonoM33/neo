import { env, isMattermostEnabled } from '../../config/env';
import {
  changelogCategoryLabels,
  type ChangelogEntry,
} from '../../db/schema';
import { postToChannel } from '../mattermost/mattermost.client';
import type { ReleaseWithEntries } from './changelog.service';

// Emoji par categorie, aligne sur le rendu email (email.composer) pour une
// identite visuelle coherente entre l'email, Mattermost et le CHANGELOG.md.
const CATEGORY_EMOJI: Record<ChangelogEntry['category'], string> = {
  nouveaute: '✨',
  amelioration: '⬆️',
  correction: '🔧',
};

// Ordre d'affichage des categories dans l'annonce.
const CATEGORY_ORDER: ChangelogEntry['category'][] = [
  'nouveaute',
  'amelioration',
  'correction',
];

// Tronque une description multi-lignes pour garder le message lisible dans le canal.
function excerpt(text: string, max = 240): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

// Tri stable au sein d'une categorie : a la une d'abord, puis sortOrder, puis date.
function sortEntries(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

// Base URL publique du back-office pour les liens cliquables (Mattermost…).
// BACKOFFICE_BASE_URL prioritaire ; sinon PUBLIC_URL.
function backofficeBaseUrl(): string {
  return env.BACKOFFICE_BASE_URL ?? env.PUBLIC_URL;
}

/**
 * Compose le message Markdown annoncant une release publiee (logique pure,
 * testable). Regroupe les nouveautes par categorie, met les highlights en
 * premier, et pointe vers la page des notes de version.
 */
export function buildReleaseMattermostMessage(
  release: ReleaseWithEntries,
  baseUrl: string = backofficeBaseUrl(),
): string {
  const lines: string[] = [
    `🚀 **Nouvelle release : ${release.title}** · \`v${release.version}\``,
  ];

  if (release.description && release.description.trim()) {
    lines.push(`> ${excerpt(release.description)}`);
  }

  for (const category of CATEGORY_ORDER) {
    const entries = sortEntries(
      release.entries.filter((e) => e.category === category),
    );
    if (entries.length === 0) continue;

    const { label } = changelogCategoryLabels[category];
    lines.push('');
    lines.push(`${CATEGORY_EMOJI[category]} **${label}**`);
    for (const entry of entries) {
      lines.push(`• **${entry.title}** — ${excerpt(entry.description)}`);
    }
  }

  const notesUrl = `${baseUrl.replace(/\/$/, '')}/backoffice/release-notes`;
  lines.push('');
  lines.push(`🔗 [Voir les notes de version](${notesUrl})`);

  return lines.join('\n');
}

/**
 * Annonce une release publiee dans le canal Mattermost des notes de version
 * (best-effort : ne leve jamais et ne bloque pas la publication si le bot est
 * absent ou le canal indisponible).
 */
export async function notifyReleasePublished(
  release: ReleaseWithEntries,
): Promise<void> {
  if (!isMattermostEnabled) return;
  try {
    const message = buildReleaseMattermostMessage(release);
    await postToChannel(
      {
        channelId: env.MATTERMOST_RELEASE_CHANNEL_ID,
        channelName: env.MATTERMOST_RELEASE_CHANNEL,
      },
      message,
    );
  } catch (error) {
    console.error('[mattermost] annonce de release non envoyée:', error);
  }
}
