import { env, isMattermostEnabled } from '../../config/env';
import {
  recetteAppLabels,
  recetteKindLabels,
  recetteSeverityLabels,
  type RecetteFeedback,
} from '../../db/schema';

// Données normalisées d'un retour fraîchement créé (widget terrain OU centre de
// recette interne), suffisantes pour composer le message Mattermost.
export interface FeedbackCreatedNotification {
  id: string;
  kind: RecetteFeedback['kind'];
  severity: RecetteFeedback['severity'];
  /** 'widget' (bouton terrain) ou 'recette' (centre de recette interne). */
  source: string;
  app: RecetteFeedback['app'] | null;
  title: string;
  description?: string | null;
  author: string;
  /** Route / URL d'où vient le retour (contexte widget ou route de la feature). */
  route?: string | null;
  /** Titre de la feature recettée, quand le retour y est rattaché. */
  featureTitle?: string | null;
}

// Payload d'un "Incoming Webhook" Mattermost.
export interface MattermostMessage {
  text: string;
  username?: string;
  channel?: string;
  icon_emoji?: string;
}

const KIND_EMOJI: Record<RecetteFeedback['kind'], string> = {
  bug: ':beetle:',
  amelioration: ':bulb:',
};

const SOURCE_LABELS: Record<string, string> = {
  widget: 'Widget terrain',
  recette: 'Centre de recette',
};

// Tronque une description multi-lignes pour garder le message lisible dans le canal.
function excerpt(text: string, max = 280): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

// Construit le message Mattermost (logique pure, testable). Markdown supporté
// par Mattermost dans le champ `text`.
export function buildFeedbackMattermostMessage(
  input: FeedbackCreatedNotification
): MattermostMessage {
  const kind = recetteKindLabels[input.kind].label;
  const severity = recetteSeverityLabels[input.severity].label;
  const sourceLabel = SOURCE_LABELS[input.source] ?? input.source;

  const meta: string[] = [];
  if (input.app) meta.push(`**App** ${recetteAppLabels[input.app]}`);
  if (input.featureTitle) meta.push(`**Feature** ${input.featureTitle}`);
  meta.push(`**Par** ${input.author}`);
  meta.push(`**Source** ${sourceLabel}`);
  if (input.route) meta.push(`**Route** \`${input.route}\``);

  const lines = [
    `${KIND_EMOJI[input.kind]} **Nouveau ${kind.toLowerCase()}** · _${severity}_`,
    `**${input.title}**`,
  ];
  if (input.description && input.description.trim()) {
    lines.push(`> ${excerpt(input.description)}`);
  }
  lines.push(meta.join(' · '));

  const recetteUrl = `${env.PUBLIC_URL.replace(/\/$/, '')}/backoffice/recette`;
  lines.push(`🔗 [Ouvrir dans le centre de recette](${recetteUrl})`);

  const message: MattermostMessage = {
    text: lines.join('\n'),
    username: env.MATTERMOST_USERNAME,
    icon_emoji: KIND_EMOJI[input.kind],
  };
  if (env.MATTERMOST_CHANNEL) message.channel = env.MATTERMOST_CHANNEL;
  return message;
}

// Mappe une ligne RecetteFeedback (+ contexte feature) vers la notification.
export function toFeedbackNotification(
  fb: RecetteFeedback,
  extra: { featureTitle?: string | null; route?: string | null } = {}
): FeedbackCreatedNotification {
  return {
    id: fb.id,
    kind: fb.kind,
    severity: fb.severity,
    source: fb.source,
    app: fb.app ?? null,
    title: fb.title,
    description: fb.actualResult,
    author: fb.author,
    route: extra.route ?? fb.context?.route ?? fb.context?.url ?? null,
    featureTitle: extra.featureTitle ?? null,
  };
}

// Notifie le canal Mattermost dédié (best-effort : ne bloque ni ne casse la
// création du retour si le webhook est absent ou indisponible).
export async function notifyFeedbackCreated(
  fb: RecetteFeedback,
  extra: { featureTitle?: string | null; route?: string | null } = {}
): Promise<void> {
  if (!isMattermostEnabled || !env.MATTERMOST_WEBHOOK_URL) return;

  try {
    const message = buildFeedbackMattermostMessage(
      toFeedbackNotification(fb, extra)
    );
    const res = await fetch(env.MATTERMOST_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      console.error(
        `[mattermost] notification refusée (${res.status}): ${await res
          .text()
          .catch(() => '')}`
      );
    }
  } catch (error) {
    console.error('[mattermost] notification non envoyée:', error);
  }
}
