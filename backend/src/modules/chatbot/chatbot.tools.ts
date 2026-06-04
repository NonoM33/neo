import type OpenAI from 'openai';
import { getProducts } from '../products/products.service';
import {
  getPublicAppointmentTypes,
  getAggregatedSlots,
  createPublicBooking,
} from '../booking/booking.service';
import { publicBookingSchema } from '../booking/booking.schema';
import { sendEmail, renderBookingConfirmationEmail } from '../email';
import { env } from '../../config/env';
import * as chatbotService from './chatbot.service';

// ─── Contexte & types ────────────────────────────────────────────────────────

/** Contexte transmis aux outils du chatbot (lié à la session du visiteur). */
export interface ChatbotToolContext {
  sessionId: string;
}

type ToolHandler = (
  ctx: ChatbotToolContext,
  args: Record<string, unknown>
) => Promise<unknown>;

interface ChatbotTool {
  name: string;
  definition: OpenAI.Chat.Completions.ChatCompletionTool;
  handler: ToolHandler;
}

const TYPE_LABELS: Record<string, string> = {
  visite_technique: 'Visite technique',
  audit: 'Audit',
  rdv_commercial: 'RDV Commercial',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function priceTTC(priceHT: string | null, tvaRate: string | null): number | null {
  if (priceHT == null) return null;
  const ht = Number(priceHT);
  if (Number.isNaN(ht)) return null;
  const tva = Number(tvaRate ?? '20');
  const rate = Number.isNaN(tva) ? 20 : tva;
  return Math.round(ht * (1 + rate / 100) * 100) / 100;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

// ─── Outils ──────────────────────────────────────────────────────────────────

/** Liste/recherche les produits du catalogue avec leurs tarifs. */
async function listProducts(
  _ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const search = asString(args.recherche);
  const category = asString(args.categorie);
  const result = await getProducts(
    { page: 1, limit: 12 },
    { search, category, isActive: true }
  );
  return {
    success: true,
    produits: result.data.map((p) => ({
      nom: p.name,
      categorie: p.category,
      marque: p.brand,
      description: p.description,
      prix_ht: Number(p.priceHT),
      prix_ttc: priceTTC(p.priceHT, p.tvaRate),
    })),
    total: result.meta.total,
  };
}

/** Renvoie les types de rendez-vous réservables en ligne. */
async function listAppointmentTypes(): Promise<unknown> {
  const types = await getPublicAppointmentTypes();
  return {
    success: true,
    types: types.map((t) => ({ type: t.type, libelle: t.label })),
  };
}

/** Renvoie les créneaux disponibles pour un type de RDV sur les 14 prochains jours. */
async function listAvailability(
  _ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const type = asString(args.type);
  if (!type) {
    return { success: false, message: 'Le type de rendez-vous est requis.' };
  }
  const fromStr = asString(args.date_debut);
  const from = fromStr ? new Date(`${fromStr}T00:00:00`) : new Date();
  if (Number.isNaN(from.getTime())) {
    return { success: false, message: 'Date de début invalide (format YYYY-MM-DD).' };
  }
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  try {
    const slots = await getAggregatedSlots(type, from, to);
    return {
      success: true,
      creneaux: slots.slice(0, 12).map((s) => ({
        date: s.date,
        heure: s.startTime,
      })),
      message: slots.length === 0 ? 'Aucun créneau disponible sur cette période.' : undefined,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Type de rendez-vous indisponible.',
    };
  }
}

/** Réserve un rendez-vous complet et envoie l'email de confirmation. */
async function bookAppointment(
  ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const input = {
    type: args.type,
    date: args.date,
    startTime: args.heure,
    firstName: args.prenom,
    lastName: args.nom,
    email: args.email,
    phone: args.telephone,
    address: args.adresse,
    postalCode: args.code_postal,
    city: args.ville,
    housingType: args.type_logement,
    needs: Array.isArray(args.besoins) ? args.besoins : undefined,
    message: args.message,
    consent: true,
  };

  const parsed = publicBookingSchema.safeParse(input);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return {
      success: false,
      message:
        "Informations manquantes ou invalides pour réserver. Demande au visiteur : " +
        missing.join(' ; '),
    };
  }

  let result;
  try {
    result = await createPublicBooking(parsed.data);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Échec de la réservation. Propose un autre créneau.',
    };
  }

  // Coordonnées visibles côté console staff (le lead est créé par le booking).
  await chatbotService.updateSessionContact(ctx.sessionId, {
    name: `${parsed.data.firstName} ${parsed.data.lastName}`,
    email: parsed.data.email,
    phone: parsed.data.phone,
  });

  // Email de confirmation (best-effort : un échec n'annule pas la réservation).
  const manageUrl = result.publicToken
    ? `${env.SITE_BASE_URL}/rdv?t=${result.publicToken}`
    : undefined;
  try {
    const mail = renderBookingConfirmationEmail({
      clientFirstName: parsed.data.firstName,
      typeLabel: TYPE_LABELS[parsed.data.type] ?? parsed.data.type,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      address: `${parsed.data.address}, ${parsed.data.postalCode} ${parsed.data.city}`,
      assignedToName: result.assignedTo,
      manageUrl,
    });
    await sendEmail({
      to: parsed.data.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (err) {
    console.error('[chatbot] booking confirmation email failed:', err);
  }

  return {
    success: true,
    message: 'Rendez-vous réservé et email de confirmation envoyé.',
    date: parsed.data.date,
    heure: parsed.data.startTime,
    type: TYPE_LABELS[parsed.data.type] ?? parsed.data.type,
    conseiller: result.assignedTo,
    lien_gestion: manageUrl,
  };
}

/** Capture un lead "léger" quand le visiteur laisse ses coordonnées sans réserver. */
async function captureLead(
  ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await chatbotService.captureRdv(ctx.sessionId, {
    nom: asString(args.nom),
    email: asString(args.email),
    telephone: asString(args.telephone),
    besoin: asString(args.besoin),
    creneau_souhaite: asString(args.creneau_souhaite),
  });
  return result;
}

// ─── Registre ──────────────────────────────────────────────────────────────

const tools: ChatbotTool[] = [
  {
    name: 'enregistrer_rdv',
    definition: {
      type: 'function',
      function: {
        name: 'enregistrer_rdv',
        description:
          "Capture les coordonnées d'un visiteur intéressé qui ne réserve PAS encore de créneau précis (lead à rappeler). À utiliser uniquement quand on a au moins le nom et un moyen de contact mais que le visiteur ne veut pas choisir de créneau maintenant. Si le visiteur veut réellement un RDV avec un créneau, utilise plutôt reserver_rdv.",
        parameters: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Prénom et nom du visiteur' },
            email: { type: 'string' },
            telephone: { type: 'string' },
            besoin: { type: 'string', description: 'Résumé du besoin/projet domotique' },
            creneau_souhaite: { type: 'string', description: 'Disponibilités évoquées' },
          },
          required: ['nom', 'besoin'],
        },
      },
    },
    handler: captureLead,
  },
  {
    name: 'lister_produits',
    definition: {
      type: 'function',
      function: {
        name: 'lister_produits',
        description:
          'Liste ou recherche les produits du catalogue Neo Domotique avec leurs tarifs (prix HT et TTC). À utiliser pour renseigner le visiteur sur les produits, gammes et prix.',
        parameters: {
          type: 'object',
          properties: {
            recherche: { type: 'string', description: 'Mot-clé de recherche (nom, référence, description)' },
            categorie: { type: 'string', description: 'Filtrer par catégorie de produit' },
          },
        },
      },
    },
    handler: listProducts,
  },
  {
    name: 'lister_types_rdv',
    definition: {
      type: 'function',
      function: {
        name: 'lister_types_rdv',
        description:
          "Liste les types de rendez-vous réservables en ligne (visite technique, audit, RDV commercial). À appeler avant de proposer des créneaux.",
        parameters: { type: 'object', properties: {} },
      },
    },
    handler: listAppointmentTypes,
  },
  {
    name: 'consulter_disponibilites',
    definition: {
      type: 'function',
      function: {
        name: 'consulter_disponibilites',
        description:
          "Renvoie les créneaux disponibles pour un type de rendez-vous sur les 14 prochains jours. Propose ensuite quelques créneaux au visiteur.",
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['visite_technique', 'audit', 'rdv_commercial'],
              description: 'Type de rendez-vous',
            },
            date_debut: { type: 'string', description: 'Date de début de recherche au format YYYY-MM-DD (optionnel)' },
          },
          required: ['type'],
        },
      },
    },
    handler: listAvailability,
  },
  {
    name: 'reserver_rdv',
    definition: {
      type: 'function',
      function: {
        name: 'reserver_rdv',
        description:
          "Réserve définitivement un rendez-vous une fois que le visiteur a choisi un créneau ET fourni TOUTES ses coordonnées (prénom, nom, email, téléphone, adresse complète : rue, code postal, ville). Envoie un email de confirmation. N'appelle cet outil que lorsque toutes ces informations sont réunies.",
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['visite_technique', 'audit', 'rdv_commercial'] },
            date: { type: 'string', description: 'Date du RDV au format YYYY-MM-DD' },
            heure: { type: 'string', description: 'Heure du RDV au format HH:MM' },
            prenom: { type: 'string' },
            nom: { type: 'string' },
            email: { type: 'string' },
            telephone: { type: 'string' },
            adresse: { type: 'string', description: 'Numéro et rue' },
            code_postal: { type: 'string', description: 'Code postal à 5 chiffres' },
            ville: { type: 'string' },
            type_logement: { type: 'string', enum: ['appartement', 'maison', 'autre'] },
            besoins: { type: 'array', items: { type: 'string' }, description: 'Liste des besoins/projets' },
            message: { type: 'string', description: 'Précisions libres' },
          },
          required: ['type', 'date', 'heure', 'prenom', 'nom', 'email', 'telephone', 'adresse', 'code_postal', 'ville'],
        },
      },
    },
    handler: bookAppointment,
  },
];

const handlersByName = new Map(tools.map((t) => [t.name, t.handler]));

export function getToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => t.definition);
}

/** Exécute un outil par nom à partir des arguments JSON renvoyés par le modèle. */
export async function executeTool(
  ctx: ChatbotToolContext,
  name: string,
  argsJson: string
): Promise<unknown> {
  const handler = handlersByName.get(name);
  if (!handler) return { success: false, message: `Outil inconnu : ${name}` };

  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(argsJson || '{}');
    if (parsed && typeof parsed === 'object') args = parsed as Record<string, unknown>;
  } catch {
    args = {};
  }

  try {
    return await handler(ctx, args);
  } catch (err) {
    console.error(`[chatbot] tool ${name} error:`, err);
    return { success: false, message: 'Une erreur est survenue lors de cette action.' };
  }
}
