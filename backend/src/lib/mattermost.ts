/**
 * Client minimal pour l'API REST Mattermost via un compte bot.
 * Permet de poster un message dans un canal (ex. canal des commerciaux).
 *
 * Distinct de l'intégration "Incoming Webhook" (recette/feedback) : ici on
 * utilise un token de compte bot (Authorization: Bearer ...), ce qui autorise
 * la résolution d'un canal par son nom et le post dans n'importe quel canal
 * dont le bot est membre.
 */

import { env, isMattermostBotEnabled } from '../config/env';

const REQUEST_TIMEOUT_MS = 5000;

function apiBase(): string {
  return (env.MATTERMOST_URL ?? '').replace(/\/$/, '');
}

async function mmFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBase()}/api/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MATTERMOST_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

// Mémoïsation de l'ID de canal résolu par nom (évite un appel API par message).
let cachedChannelId: string | null = null;

/**
 * Résout l'ID du canal des commerciaux : utilise l'ID explicite si fourni,
 * sinon le résout depuis l'équipe + le nom de canal.
 */
export async function resolveCommercialChannelId(): Promise<string | null> {
  if (env.MATTERMOST_COMMERCIAL_CHANNEL_ID) {
    return env.MATTERMOST_COMMERCIAL_CHANNEL_ID;
  }
  if (cachedChannelId) return cachedChannelId;

  const team = env.MATTERMOST_TEAM;
  const channel = env.MATTERMOST_COMMERCIAL_CHANNEL;
  if (!team || !channel) return null;

  try {
    const res = await mmFetch(
      `/teams/name/${encodeURIComponent(team)}/channels/name/${encodeURIComponent(channel)}`
    );
    if (!res.ok) {
      console.error(`[mattermost] résolution canal échouée (${res.status})`);
      return null;
    }
    const data = (await res.json()) as { id?: string };
    cachedChannelId = data.id ?? null;
    return cachedChannelId;
  } catch (err) {
    console.error('[mattermost] résolution canal impossible:', err);
    return null;
  }
}

/** Poste un message Markdown dans un canal. Renvoie true si Mattermost accepte. */
export async function postChannelMessage(
  channelId: string,
  message: string
): Promise<boolean> {
  const res = await mmFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId, message }),
  });
  if (!res.ok) {
    console.error(
      `[mattermost] post refusé (${res.status}): ${await res
        .text()
        .catch(() => '')}`
    );
    return false;
  }
  return true;
}

/**
 * Poste un message dans le canal des commerciaux (best-effort).
 * Ne lève jamais : une indisponibilité Mattermost ne doit pas casser le flux chat.
 */
export async function postToCommercialChannel(message: string): Promise<boolean> {
  if (!isMattermostBotEnabled) return false;
  try {
    const channelId = await resolveCommercialChannelId();
    if (!channelId) {
      console.error('[mattermost] canal commercial introuvable (config manquante)');
      return false;
    }
    return await postChannelMessage(channelId, message);
  } catch (err) {
    console.error('[mattermost] notification non envoyée:', err);
    return false;
  }
}
