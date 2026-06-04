/**
 * Notification de l'équipe commerciale (Mattermost) à l'ouverture d'une
 * conversation chatbot, avec un lien direct pour prendre la main sur le client.
 */

import { env } from '../../config/env';
import { postToCommercialChannel } from '../../lib/mattermost';
import type { ChatbotSession } from '../../db/schema';

export interface NewConversationNotification {
  sessionId: string;
  visitorName?: string | null;
  pageUrl?: string | null;
  firstMessage: string;
}

/** Lien direct vers la console staff, ouverture automatique de la session. */
export function staffConsoleUrl(sessionId: string): string {
  const base = env.PUBLIC_URL.replace(/\/$/, '');
  return `${base}/backoffice/support/chat?session=${encodeURIComponent(sessionId)}`;
}

function excerpt(text: string, max = 200): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

/** Construit le message Markdown (logique pure, testable). */
export function buildNewConversationMessage(
  input: NewConversationNotification
): string {
  const who = input.visitorName?.trim() || 'Un visiteur';
  const lines = [
    `💬 **Nouvelle conversation** — ${who} discute avec l'assistant.`,
    `> ${excerpt(input.firstMessage)}`,
  ];
  if (input.pageUrl) lines.push(`**Page** \`${input.pageUrl}\``);
  lines.push(
    `🙋 [Prendre la main sur ce client](${staffConsoleUrl(input.sessionId)})`
  );
  return lines.join('\n');
}

/**
 * Notifie le canal des commerciaux qu'une conversation vient de démarrer.
 * Best-effort : n'interrompt jamais le flux chat.
 */
export async function notifyNewConversation(
  session: Pick<ChatbotSession, 'id' | 'visitorName' | 'pageUrl'>,
  firstMessage: string
): Promise<void> {
  const message = buildNewConversationMessage({
    sessionId: session.id,
    visitorName: session.visitorName,
    pageUrl: session.pageUrl,
    firstMessage,
  });
  await postToCommercialChannel(message);
}
