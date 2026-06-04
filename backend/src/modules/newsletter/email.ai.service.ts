import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { changelogCategoryLabels } from '../../db/schema';
import type { ReleaseWithEntries } from './changelog.service';
import {
  buildCampaignHtml,
  renderBodyFromReleases,
} from './email.composer';

const getClient = (() => {
  let client: Anthropic | null = null;
  return () => {
    if (!client) {
      client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return client;
  };
})();

export interface DraftedCampaign {
  subject: string;
  bodyHtml: string;
  // 'ia' quand redige par Claude, 'repli' quand l'IA est indisponible.
  source: 'ia' | 'repli';
}

const SYSTEM_PROMPT = `Tu es le responsable communication de Neo Domotique, une solution de domotique haut de gamme en marque blanche.
Tu rediges une newsletter chaleureuse, professionnelle et claire qui presente les nouveautes produit a des clients non techniques.
Regles:
- Ecris en francais, ton enthousiaste mais sobre, sans jargon.
- Mets en avant la valeur pour le client (ce que ca lui apporte), pas la technique.
- Structure le corps par release, avec un court paragraphe d'introduction puis les nouveautes.
- Reponds UNIQUEMENT avec du HTML inline (balises <h2>, <p>, <ul>, <li>, <strong> avec attributs style=). N'inclus PAS <html>, <head> ou <body>.
- N'invente jamais de fonctionnalite : appuie-toi strictement sur la liste fournie.`;

// Construit le resume structure des nouveautes pour le prompt.
export function buildPromptPayload(grouped: ReleaseWithEntries[]): string {
  const lines: string[] = [];
  for (const release of grouped) {
    lines.push(`Release "${release.title}" (version ${release.version}):`);
    for (const entry of release.entries) {
      const label = changelogCategoryLabels[entry.category].label;
      const star = entry.isHighlight ? ' [A METTRE EN AVANT]' : '';
      lines.push(`  - (${label})${star} ${entry.title} — ${entry.description}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

interface AiJsonResponse {
  subject?: unknown;
  bodyHtml?: unknown;
}

// Extrait {subject, bodyHtml} d'une reponse texte du modele, tolerante au
// JSON entoure de texte ou de balises de code.
export function parseAiResponse(
  raw: string
): { subject: string; bodyHtml: string } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as AiJsonResponse;
    if (
      typeof parsed.subject === 'string' &&
      typeof parsed.bodyHtml === 'string' &&
      parsed.subject.trim() &&
      parsed.bodyHtml.trim()
    ) {
      return { subject: parsed.subject.trim(), bodyHtml: parsed.bodyHtml };
    }
  } catch {
    return null;
  }
  return null;
}

function fallbackDraft(grouped: ReleaseWithEntries[]): DraftedCampaign {
  const versions = grouped.map((r) => r.version).join(', ');
  return {
    subject: grouped.length
      ? `Neo Domotique — Nouveautes (${versions})`
      : 'Neo Domotique — Nouveautes',
    bodyHtml: `<p style="font-size:15px;color:#495057;line-height:1.6;">Bonjour,</p><p style="font-size:15px;color:#495057;line-height:1.6;">Voici les dernieres nouveautes de votre solution Neo Domotique.</p>${renderBodyFromReleases(
      grouped
    )}<p style="font-size:15px;color:#495057;line-height:1.6;">A tres vite,<br/>L'equipe Neo Domotique</p>`,
    source: 'repli',
  };
}

// Redige la campagne via Claude, avec repli deterministe si pas de cle API
// ou en cas d'erreur/reponse invalide (jamais d'echec dur cote admin).
export async function draftCampaign(
  grouped: ReleaseWithEntries[]
): Promise<DraftedCampaign> {
  if (!env.ANTHROPIC_API_KEY) {
    return fallbackDraft(grouped);
  }

  try {
    const payload = buildPromptPayload(grouped);
    const response = await getClient().messages.create({
      model: env.AI_MODEL,
      max_tokens: env.AI_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Voici les nouveautes a presenter:\n\n${payload}\n\nReponds avec un objet JSON: {"subject": "...", "bodyHtml": "..."}. Le sujet doit etre accrocheur (max 80 caracteres). Le bodyHtml contient l'introduction et toutes les sections.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    const parsed = parseAiResponse(raw);
    if (parsed) {
      return { subject: parsed.subject, bodyHtml: parsed.bodyHtml, source: 'ia' };
    }
    return fallbackDraft(grouped);
  } catch {
    return fallbackDraft(grouped);
  }
}

// Assemble une campagne prete (sujet + HTML complet avec placeholders).
export async function draftCampaignHtml(
  grouped: ReleaseWithEntries[]
): Promise<{ subject: string; html: string; source: DraftedCampaign['source'] }> {
  const draft = await draftCampaign(grouped);
  return {
    subject: draft.subject,
    html: buildCampaignHtml(draft.subject, draft.bodyHtml),
    source: draft.source,
  };
}
