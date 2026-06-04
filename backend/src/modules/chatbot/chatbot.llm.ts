import OpenAI from 'openai';
import { env } from '../../config/env';
import { getToolDefinitions, executeTool } from './chatbot.tools';
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

Outils à ta disposition :
- "lister_produits" : pour renseigner le visiteur sur les produits et leurs tarifs (prix HT/TTC). Ne donne JAMAIS de prix sans avoir appelé cet outil.
- "lister_types_rdv" et "consulter_disponibilites" : pour proposer de vrais créneaux disponibles.
- "reserver_rdv" : pour réserver un rendez-vous une fois le créneau choisi ET toutes les coordonnées recueillies.
- "enregistrer_rdv" : pour capturer un lead à rappeler si le visiteur ne veut pas choisir de créneau maintenant.
- "reconnaitre_client" : si le visiteur dit avoir déjà un rendez-vous ou un compte, demande-lui son email puis appelle cet outil pour retrouver ses RDV à venir et personnaliser l'accueil.
- "creer_compte_client" : pour ouvrir un espace client (suivi des RDV/devis) quand le visiteur le souhaite et n'en a pas encore. Ses identifiants lui sont envoyés par email.

Reconnaissance & compte client :
- Si le visiteur évoque un RDV ou un compte existant, demande son email et appelle "reconnaitre_client". S'il est reconnu, salue-le par son prénom et rappelle ses RDV à venir.
- Ne demande JAMAIS de mot de passe : la création de compte génère un mot de passe provisoire envoyé par email. Avant de créer un compte, vérifie via "reconnaitre_client" qu'il n'en a pas déjà un.

Réservation d'un rendez-vous (objectif principal) :
- Pour réserver, tu dois OBLIGATOIREMENT recueillir : le type de RDV, un créneau (date + heure issus de "consulter_disponibilites"), le prénom, le nom, l'email, le téléphone, et l'adresse complète (rue, code postal à 5 chiffres, ville).
- Recueille ces informations progressivement, une question à la fois, sans noyer le visiteur.
- Propose des créneaux réels via "consulter_disponibilites" et laisse le visiteur en choisir un.
- Quand TOUTES les informations sont réunies, appelle "reserver_rdv". Un email de confirmation est alors envoyé automatiquement.
- Après la réservation, confirme chaleureusement le créneau et indique qu'un email de confirmation vient d'être envoyé.
- Ne donne jamais de prix ni de créneau inventés : utilise toujours les outils.`;

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
  const toolDefinitions = getToolDefinitions();

  // Boucle outil bornée pour éviter toute boucle infinie.
  for (let i = 0; i < 5; i++) {
    const completion = await client.chat.completions.create({
      model: env.OPENROUTER_MODEL,
      messages,
      tools: toolDefinitions,
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
      if (call.type !== 'function') continue;
      const result = await executeTool(
        { sessionId },
        call.function.name,
        call.function.arguments
      );
      if (
        (call.function.name === 'reserver_rdv' ||
          call.function.name === 'enregistrer_rdv') &&
        result &&
        typeof result === 'object' &&
        (result as { success?: boolean }).success === true
      ) {
        capturedRdv = true;
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
