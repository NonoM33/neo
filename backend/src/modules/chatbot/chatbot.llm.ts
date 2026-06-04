import OpenAI from 'openai';
import { env } from '../../config/env';
import * as chatbotService from './chatbot.service';
import type { ChatbotMessage } from '../../db/schema';

const getClient = (() => {
  let client: OpenAI | null = null;
  return () => {
    if (!client) {
      client = new OpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: env.OPENROUTER_BASE_URL,
      });
    }
    return client;
  };
})();

const SYSTEM_PROMPT = `Tu es Léa, l'assistante virtuelle de Neo Domotique, une entreprise qui installe et entretient des solutions de maison connectée (éclairage intelligent, sécurité, chauffage, pilotage à distance) pour les particuliers.

Ton rôle :
- Engager chaleureusement la conversation et comprendre le projet domotique du visiteur.
- Le rassurer, répondre brièvement à ses questions générales.
- Ton objectif principal est de DÉCROCHER UN RENDEZ-VOUS (visite technique gratuite, audit, ou rendez-vous commercial).

Style :
- Réponds en français, sur un ton amical, professionnel et concis (1 à 3 phrases maximum).
- Pose une seule question à la fois.
- N'invente jamais de prix précis ni de délais fermes : propose plutôt un rendez-vous pour un devis personnalisé.

Collecte du rendez-vous :
- Recueille progressivement : le besoin/projet, le prénom et nom, un email OU un téléphone, et le créneau souhaité.
- Dès que tu as le nom, un moyen de contact (email ou téléphone) et une idée du besoin, appelle l'outil "enregistrer_rdv".
- Après l'enregistrement, confirme chaleureusement que l'équipe va recontacter le visiteur rapidement.`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'enregistrer_rdv',
      description:
        "Enregistre la demande de rendez-vous du visiteur une fois ses coordonnées et son besoin recueillis. À appeler dès qu'on dispose du nom et d'un email ou téléphone.",
      parameters: {
        type: 'object',
        properties: {
          nom: { type: 'string', description: 'Prénom et nom du visiteur' },
          email: { type: 'string', description: 'Adresse email du visiteur' },
          telephone: { type: 'string', description: 'Numéro de téléphone du visiteur' },
          besoin: {
            type: 'string',
            description: 'Résumé du besoin ou projet domotique du visiteur',
          },
          creneau_souhaite: {
            type: 'string',
            description: 'Créneau ou disponibilités indiqués par le visiteur',
          },
        },
        required: ['nom', 'besoin'],
      },
    },
  },
];

const CORRECTION_PROMPT = `Tu corriges l'orthographe, la grammaire, la ponctuation et les accents d'un message écrit par un conseiller commercial, en français.
Règles STRICTES :
- Renvoie UNIQUEMENT le message corrigé, sans guillemets, sans préambule, sans commentaire.
- Conserve le sens, le ton, les emojis, le tutoiement/vouvoiement et les retours à la ligne d'origine.
- Ne réponds pas au message, ne le complète pas : corrige-le seulement.
- Si le message est déjà correct, renvoie-le tel quel.`;

/** Corrige l'orthographe/grammaire d'un brouillon du conseiller (renvoie le texte corrigé). */
export async function correctText(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: env.OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: CORRECTION_PROMPT },
      { role: 'user', content: trimmed },
    ],
    temperature: 0,
    max_tokens: 600,
  });

  const out = completion.choices[0]?.message?.content;
  const corrected = (out ?? '').trim();
  return corrected || text;
}

export function toChatMessage(
  m: ChatbotMessage
): OpenAI.Chat.Completions.ChatCompletionMessageParam | null {
  switch (m.role) {
    case 'visitor':
      return { role: 'user', content: m.content };
    case 'bot':
    case 'staff':
      return { role: 'assistant', content: m.content };
    case 'system':
      // Les messages techniques (prise en main, clôture) ne sont pas envoyés au modèle.
      return null;
    default:
      return null;
  }
}

export interface BotReply {
  text: string;
  capturedRdv: boolean;
}

/**
 * Génère la réponse du bot à partir de l'historique de la conversation.
 * Gère un éventuel appel à l'outil d'enregistrement de RDV.
 */
export async function generateBotReply(
  sessionId: string,
  history: ChatbotMessage[]
): Promise<BotReply> {
  const client = getClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .map(toChatMessage)
      .filter(
        (m): m is OpenAI.Chat.Completions.ChatCompletionMessageParam => m !== null
      ),
  ];

  let capturedRdv = false;

  // Boucle outil bornée pour éviter toute boucle infinie.
  for (let i = 0; i < 4; i++) {
    const completion = await client.chat.completions.create({
      model: env.OPENROUTER_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.6,
      max_tokens: 512,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    const toolCalls = choice.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { text: (choice.content ?? '').trim(), capturedRdv };
    }

    messages.push(choice);

    for (const call of toolCalls) {
      let result: chatbotService.CaptureRdvResult;
      if (call.type === 'function' && call.function.name === 'enregistrer_rdv') {
        let args: chatbotService.CaptureRdvInput = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          args = {};
        }
        result = await chatbotService.captureRdv(sessionId, args);
        if (result.success) capturedRdv = true;
      } else {
        result = { success: false, message: 'Outil inconnu' };
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    text: 'Merci ! Un conseiller Neo Domotique vous recontactera très vite.',
    capturedRdv,
  };
}
