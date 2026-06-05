import type OpenAI from 'openai';
import { getProducts } from '../products/products.service';
import {
  getPublicAppointmentTypes,
  getAggregatedSlots,
  createPublicBooking,
} from '../booking/booking.service';
import { publicBookingSchema } from '../booking/booking.schema';
import { sendEmail } from '../email';
import { renderBookingEmail, renderAccountWelcomeEmail } from '../templates/render';
import { env } from '../../config/env';
import * as chatbotService from './chatbot.service';
import {
  recognizeVisitor,
  createClientAccountFromChat,
} from './chatbot.account';
import { searchAddress, isCompleteAddress } from '../../lib/address';

/** URL de l'espace client (page de connexion du portail). */
const CLIENT_PORTAL_URL = `${env.SITE_BASE_URL}/espace-client`;

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
    const mail = await renderBookingEmail({
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

/** Reconnaît un visiteur via son email (RDV existants, compte portail). */
async function recognizeClient(
  ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const email = asString(args.email);
  if (!email) {
    return { success: false, message: "L'email est requis pour reconnaître le visiteur." };
  }
  const result = await recognizeVisitor(email);

  // Si on reconnaît le visiteur, on enrichit la session pour la console staff.
  if (result.known) {
    const name = [result.firstName, result.lastName].filter(Boolean).join(' ').trim();
    await chatbotService.updateSessionContact(ctx.sessionId, {
      name: name || undefined,
      email,
    });
  }

  return {
    success: true,
    reconnu: result.known,
    compte_existant: result.hasAccount,
    prenom: result.firstName,
    nom: result.lastName,
    rdv_a_venir: result.appointments.map((a) => ({
      type: a.typeLabel,
      date: a.date,
      heure: a.startTime,
      statut: a.status,
    })),
  };
}

/** Crée un compte espace client et envoie les identifiants par email. */
async function createAccount(
  ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const email = asString(args.email);
  if (!email) {
    return { success: false, message: "L'email est requis pour créer un compte." };
  }

  const result = await createClientAccountFromChat({
    email,
    firstName: asString(args.prenom),
    lastName: asString(args.nom),
    phone: asString(args.telephone),
  });

  if (!result.success) {
    // On ne renvoie jamais le mot de passe au modèle.
    return { success: false, deja_inscrit: result.alreadyExists ?? false, message: result.message };
  }

  // Coordonnées visibles côté console staff.
  await chatbotService.updateSessionContact(ctx.sessionId, {
    name: [asString(args.prenom), asString(args.nom)].filter(Boolean).join(' ') || undefined,
    email,
    phone: asString(args.telephone),
  });

  // Email best-effort avec les identifiants (mot de passe jamais exposé au modèle).
  if (result.tempPassword) {
    try {
      const mail = await renderAccountWelcomeEmail({
        clientFirstName: result.clientFirstName ?? asString(args.prenom) ?? 'client',
        email,
        tempPassword: result.tempPassword,
        loginUrl: CLIENT_PORTAL_URL,
      });
      await sendEmail({ to: email, subject: mail.subject, html: mail.html });
    } catch (err) {
      console.error('[chatbot] account welcome email failed:', err);
    }
  }

  return {
    success: true,
    message:
      'Compte créé. Un email avec les identifiants de connexion vient d\'être envoyé au visiteur.',
  };
}

/** Vérifie/normalise une adresse via la Base Adresse Nationale (BAN). */
async function verifyAddress(
  _ctx: ChatbotToolContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const parts = [args.adresse, args.code_postal, args.ville]
    .map(asString)
    .filter(Boolean);
  const query = parts.join(' ').trim();
  if (query.length < 3) {
    return { success: false, message: "Indique une adresse à vérifier (rue, code postal, ville)." };
  }

  let matches;
  try {
    matches = await searchAddress(query, 5);
  } catch {
    // En cas d'indisponibilité de la BAN, on ne bloque pas le parcours.
    return {
      success: true,
      verifiee: false,
      complete: false,
      message: "Le service de vérification d'adresse est momentanément indisponible.",
    };
  }

  const best = matches[0];
  if (!best) {
    return {
      success: true,
      verifiee: true,
      complete: false,
      message: "Adresse introuvable. Demande au visiteur l'adresse exacte (numéro, rue, code postal, ville).",
      suggestions: [],
    };
  }

  const complete = isCompleteAddress(best);
  return {
    success: true,
    verifiee: true,
    complete,
    adresse: best.name,
    code_postal: best.postcode,
    ville: best.city,
    libelle: best.label,
    score: Math.round(best.score * 100) / 100,
    message: complete
      ? undefined
      : "Adresse incomplète : il manque probablement le numéro de voie. Demande au visiteur le numéro exact, puis re-vérifie.",
    suggestions: matches.slice(0, 5).map((m) => m.label),
  };
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
  {
    name: 'reconnaitre_client',
    definition: {
      type: 'function',
      function: {
        name: 'reconnaitre_client',
        description:
          "Reconnaît un visiteur à partir de son email : indique s'il est déjà connu, s'il possède un compte espace client, et liste ses rendez-vous à venir. À utiliser quand le visiteur dit avoir déjà un RDV ou un compte, ou pour personnaliser l'accueil avant de proposer une nouvelle réservation.",
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email du visiteur' },
          },
          required: ['email'],
        },
      },
    },
    handler: recognizeClient,
  },
  {
    name: 'creer_compte_client',
    definition: {
      type: 'function',
      function: {
        name: 'creer_compte_client',
        description:
          "Crée un compte espace client pour le visiteur et lui envoie ses identifiants de connexion par email (un mot de passe provisoire est généré automatiquement — ne demande JAMAIS de mot de passe dans la conversation). À utiliser quand le visiteur souhaite suivre ses rendez-vous/devis et n'a pas encore de compte. Vérifie d'abord avec reconnaitre_client si un compte existe déjà.",
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email du visiteur' },
            prenom: { type: 'string' },
            nom: { type: 'string' },
            telephone: { type: 'string' },
          },
          required: ['email', 'prenom', 'nom'],
        },
      },
    },
    handler: createAccount,
  },
  {
    name: 'verifier_adresse',
    definition: {
      type: 'function',
      function: {
        name: 'verifier_adresse',
        description:
          "Vérifie une adresse postale française via la Base Adresse Nationale et indique si elle est complète (au niveau du numéro de voie). À appeler AVANT 'reserver_rdv' dès que le visiteur donne une adresse. Si 'complete' est false, demande le numéro de voie exact (ou la précision manquante) puis re-vérifie avant de réserver.",
        parameters: {
          type: 'object',
          properties: {
            adresse: { type: 'string', description: 'Numéro et rue (ou adresse libre)' },
            code_postal: { type: 'string', description: 'Code postal (optionnel)' },
            ville: { type: 'string', description: 'Ville (optionnel)' },
          },
          required: ['adresse'],
        },
      },
    },
    handler: verifyAddress,
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
