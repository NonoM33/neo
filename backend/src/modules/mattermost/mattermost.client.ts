import { env, isMattermostEnabled } from '../../config/env';

// Client minimal du compte bot Mattermost (API REST v4). Sert aux notifications
// internes (retours recette/feedback, ouverture de conversation chatbot…).
//
// Le bot poste avec son identité ("charles") ; aucun webhook entrant requis.
// Toutes les méthodes sont best-effort côté appelant : elles peuvent lever, à
// charge de l'appelant de ne pas bloquer le flux métier.

function baseUrl(): string {
  return (env.MATTERMOST_URL ?? '').replace(/\/$/, '');
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${env.MATTERMOST_BOT_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

// Cache nom de canal -> id (résolution coûteuse, le mapping ne change pas).
const channelIdCache = new Map<string, string>();

// Résout l'id d'un canal à partir de son nom (slug) dans une team donnée.
export async function resolveChannelIdByName(
  team: string,
  channelName: string
): Promise<string | null> {
  const cacheKey = `${team}/${channelName}`;
  const cached = channelIdCache.get(cacheKey);
  if (cached) return cached;

  const url = `${baseUrl()}/api/v4/teams/name/${encodeURIComponent(
    team
  )}/channels/name/${encodeURIComponent(channelName)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    console.error(
      `[mattermost] canal "${channelName}" introuvable dans "${team}" (${res.status})`
    );
    return null;
  }
  const channel = (await res.json()) as { id?: string };
  if (!channel.id) return null;
  channelIdCache.set(cacheKey, channel.id);
  return channel.id;
}

// Poste un message Markdown dans un canal (par id). Retourne true si publié.
export async function postMessage(
  channelId: string,
  message: string
): Promise<boolean> {
  const res = await fetch(`${baseUrl()}/api/v4/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ channel_id: channelId, message }),
  });
  if (!res.ok) {
    console.error(
      `[mattermost] publication refusée (${res.status}): ${await res
        .text()
        .catch(() => '')}`
    );
    return false;
  }
  return true;
}

export interface ChannelTarget {
  /** Id explicite du canal (prioritaire). */
  channelId?: string;
  /** Nom du canal à résoudre dans la team (fallback). */
  channelName?: string;
}

// Poste un message dans un canal ciblé par id (prioritaire) ou par nom.
// No-op si le bot n'est pas configuré ou si le canal ne peut être résolu.
export async function postToChannel(
  target: ChannelTarget,
  message: string
): Promise<boolean> {
  if (!isMattermostEnabled) return false;

  let channelId = target.channelId?.trim();
  if (!channelId && target.channelName && env.MATTERMOST_TEAM) {
    channelId =
      (await resolveChannelIdByName(
        env.MATTERMOST_TEAM,
        target.channelName
      )) ?? undefined;
  }
  if (!channelId) {
    console.error(
      '[mattermost] aucun canal cible (ni id ni team+nom résolus) — message ignoré'
    );
    return false;
  }
  return postMessage(channelId, message);
}

// Réinitialise le cache de résolution (tests).
export function __clearChannelCache(): void {
  channelIdCache.clear();
}
