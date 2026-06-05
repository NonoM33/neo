import OpenAI from 'openai';
import { env } from '../../config/env';
import { getConfiguratorCatalog } from './configurateur.service';
import { getProductDependencies } from '../products/products.service';
import { cheaperAlternatives, type SuggestProduct } from './configurateur.suggest';
import type {
  AssistantAction,
  AssistantChoice,
  AssistantInput,
  AssistantReply,
} from './configurateur.assistant.schema';

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

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const SYSTEM_PROMPT = `Tu es Léo, le guide domotique de Neo Domotique, intégré au configurateur en ligne.
Le visiteur compose lui-même son installation (caméras, alarme, capteurs, éclairage…) pièce par pièce et voit un prix TTC en temps réel.

Ta mission :
- L'aider à bâtir une configuration adaptée à SON projet et à SON budget, simplement.
- Expliquer les dépendances : pourquoi certains équipements nécessitent un bridge/une passerelle (les capteurs Zigbee/Z-Wave ne communiquent pas seuls — le bridge fait le lien avec internet et l'app). Un seul bridge couvre souvent plusieurs équipements.
- Proposer des produits équivalents moins chers quand c'est trop cher, ou pour éviter d'acheter un bridge si le visiteur n'en veut pas (alternative Wi-Fi autonome par exemple).
- Tu peux AGIR sur TOUT le configurateur : ajoute/retire des équipements, mais aussi CRÉE, RENOMME, DÉPLACE (étage) ou SUPPRIME des pièces toi-même quand le visiteur est d'accord.
- Gère les étages : si le visiteur parle d'un « 1er étage », d'un « sous-sol », crée les pièces avec le bon étage (floor : 0 = rez-de-chaussée, 1 = 1er, -1 = sous-sol).

Style :
- Réponds en français, ton amical et concret, 1 à 4 phrases. Pas de jargon inutile.
- Le catalogue exact (catégories, références et prix) t'est fourni ci-dessous : appuie-toi dessus, n'invente aucune référence ni aucun prix.
- Utilise EXACTEMENT les noms de catégorie du catalogue fourni (ex : « Sécurité » pour les caméras, « Éclairage », « Volets »…), pas des mots-clés inventés.
- Avant d'ajouter un équipement, assure-toi d'avoir une pièce de destination valide (utilise la liste des pièces fournie).
- Quand tu ajoutes/retires quelque chose, dis-le clairement et explique pourquoi en une phrase.

Choix cliquables (IMPORTANT) :
- Termine CHAQUE réponse en appelant "proposer_choix" avec 2 à 4 boutons de réponse rapide, pertinents et contextuels au message (la suite logique de la conversation).
- Quand tu SUGGÈRES une modification sans être sûr que le visiteur la veut (ex : « je te propose de retirer la Sonos Arc »), ne l'applique PAS tout de suite : propose-la comme un bouton cliquable (ex : label « Oui, retire-la » → send « Retire la Sonos Arc »). Le clic confirmera. Quand le visiteur a clairement validé, agis directement.
- Le "label" est court (2-4 mots, le texte du bouton) ; le "send" est le message complet envoyé en ton nom quand on clique.

Outils :
- "rechercher_produits" : explore le catalogue (par catégorie, mot-clé, prix max).
- "alternatives_moins_cheres" : trouve des équivalents moins chers d'un produit.
- "expliquer_dependances" : liste ce qu'un produit requiert (bridge, etc.) et pourquoi.
- "ajouter_equipement" / "retirer_equipement" : modifient le panier du visiteur.
- "proposer_choix" : attache des boutons cliquables de réponse rapide sous ton message.`;

export interface ToolContext {
  catalog: SuggestProduct[];
  rooms: AssistantInput['rooms'];
  actions: AssistantAction[];
  /** Choix cliquables proposés par le guide pour le message courant. */
  choices?: AssistantChoice[];
}

/**
 * Nettoie les choix proposés par l'IA : on ne garde que des boutons avec un
 * libellé exploitable, on retombe sur le libellé si `send` manque, on
 * déduplique par libellé (insensible à la casse) et on plafonne à 4 boutons.
 */
export function normalizeChoices(raw: unknown): AssistantChoice[] {
  if (!Array.isArray(raw)) return [];
  const out: AssistantChoice[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const label = typeof rec.label === 'string' ? rec.label.trim() : '';
    const sendRaw = typeof rec.send === 'string' ? rec.send.trim() : '';
    const send = sendRaw || label;
    if (!label || !send) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: label.slice(0, 60), send: send.slice(0, 200) });
    if (out.length >= 4) break;
  }
  return out;
}

function buildToolDefinitions(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'rechercher_produits',
        description:
          'Recherche des produits du catalogue par catégorie, mot-clé et/ou prix TTC maximum.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Catégorie exacte telle qu’indiquée dans le catalogue fourni (ex : Sécurité, Éclairage).' },
            query: { type: 'string', description: 'Mot-clé dans le nom ou la marque.' },
            maxPriceTTC: { type: 'number', description: 'Prix TTC maximum.' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'alternatives_moins_cheres',
        description:
          'Trouve des équivalents moins chers (même catégorie) pour un produit identifié par son id.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Id du produit de référence.' },
            maxPriceTTC: { type: 'number', description: 'Plafond de prix TTC optionnel.' },
          },
          required: ['productId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'expliquer_dependances',
        description:
          'Liste les équipements requis/recommandés par un produit (bridge, passerelle…) et leur raison.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Id du produit à analyser.' },
          },
          required: ['productId'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ajouter_equipement',
        description: 'Ajoute une quantité d’un produit dans une pièce du panier du visiteur.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            room: { type: 'string', description: 'Clé de la pièce (cf. liste des pièces).' },
            quantity: { type: 'number', description: 'Quantité à ajouter (défaut 1).' },
          },
          required: ['productId', 'room'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'retirer_equipement',
        description: 'Retire un produit d’une pièce du panier du visiteur.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            room: { type: 'string' },
            quantity: { type: 'number', description: 'Quantité à retirer (défaut : tout).' },
          },
          required: ['productId', 'room'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'ajouter_piece',
        description:
          'Crée une nouvelle pièce dans la maison du visiteur (ex : « Buanderie »). Renvoie sa clé, utilisable ensuite pour y placer des équipements.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nom lisible de la pièce.' },
            floor: { type: 'number', description: 'Étage (0 = rez-de-chaussée). Optionnel.' },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'renommer_piece',
        description: 'Renomme une pièce existante (identifiée par sa clé ou son libellé).',
        parameters: {
          type: 'object',
          properties: {
            room: { type: 'string', description: 'Clé ou libellé de la pièce à renommer.' },
            name: { type: 'string', description: 'Nouveau nom.' },
          },
          required: ['room', 'name'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'changer_etage_piece',
        description: 'Déplace une pièce vers un autre étage (0 = rez-de-chaussée).',
        parameters: {
          type: 'object',
          properties: {
            room: { type: 'string', description: 'Clé ou libellé de la pièce.' },
            floor: { type: 'number', description: 'Étage cible.' },
          },
          required: ['room', 'floor'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'supprimer_piece',
        description: 'Retire une pièce de la maison du visiteur (et ses équipements).',
        parameters: {
          type: 'object',
          properties: {
            room: { type: 'string', description: 'Clé ou libellé de la pièce à retirer.' },
          },
          required: ['room'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'lister_pieces',
        description: 'Liste les pièces actuelles de la maison avec leur étage.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'proposer_choix',
        description:
          'Attache 2 à 4 boutons cliquables de réponse rapide sous ton message (façon clavier inline d’un bot). À appeler à la fin de chaque réponse.',
        parameters: {
          type: 'object',
          properties: {
            choices: {
              type: 'array',
              maxItems: 4,
              description: 'Liste de 2 à 4 boutons contextuels.',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'Texte court du bouton (2-4 mots).' },
                  send: {
                    type: 'string',
                    description: 'Message envoyé au guide quand on clique (défaut : le label).',
                  },
                },
                required: ['label'],
              },
            },
          },
          required: ['choices'],
        },
      },
    },
  ];
}

function findProduct(catalog: SuggestProduct[], id: string): SuggestProduct | undefined {
  return catalog.find((p) => p.id === id);
}

/** Translitère un nom de pièce en clé stable, unique parmi `existing`. */
export function slugifyRoomKey(name: string, existing: readonly string[]): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'piece';
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function resolveRoom(ctx: ToolContext, room: string): string | null {
  if (ctx.rooms.length === 0) return room; // pas de liste : on fait confiance
  const match = ctx.rooms.find((r) => r.key === room || r.label === room);
  return match ? match.key : null;
}

export async function runTool(
  ctx: ToolContext,
  name: string,
  rawArgs: string,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { error: 'Arguments illisibles.' };
  }

  switch (name) {
    case 'rechercher_produits': {
      const category = typeof args.category === 'string' ? args.category.toLowerCase() : null;
      const query = typeof args.query === 'string' ? args.query.toLowerCase() : null;
      const maxPrice = typeof args.maxPriceTTC === 'number' ? args.maxPriceTTC : null;
      const matches = ctx.catalog
        .filter((p) => {
          if (category && p.category.toLowerCase() !== category) return false;
          if (maxPrice != null && p.priceTTC > maxPrice) return false;
          if (query) {
            const hay = `${p.name} ${p.brand ?? ''}`.toLowerCase();
            if (!hay.includes(query)) return false;
          }
          return true;
        })
        .slice(0, 12)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          brand: p.brand ?? null,
          priceTTC: Math.round(p.priceTTC * 100) / 100,
        }));
      return { count: matches.length, products: matches };
    }

    case 'alternatives_moins_cheres': {
      const productId = String(args.productId ?? '');
      const maxPriceTTC = typeof args.maxPriceTTC === 'number' ? args.maxPriceTTC : undefined;
      const target = findProduct(ctx.catalog, productId);
      const alts = cheaperAlternatives(ctx.catalog, productId, { maxPriceTTC });
      return {
        reference: target ? { id: target.id, name: target.name, priceTTC: target.priceTTC } : null,
        alternatives: alts,
      };
    }

    case 'expliquer_dependances': {
      const productId = String(args.productId ?? '');
      try {
        const deps = await getProductDependencies(productId);
        return {
          count: deps.length,
          dependencies: deps.map((d) => ({
            type: d.type, // 'required' | 'recommended'
            description: d.description,
            coveredQuantity: d.coveredQuantity,
            product: {
              id: d.requiredProduct.id,
              name: d.requiredProduct.name,
              category: d.requiredProduct.category,
              priceTTC:
                parseFloat(d.requiredProduct.priceHT) *
                (1 + parseFloat(d.requiredProduct.tvaRate) / 100),
            },
          })),
        };
      } catch {
        return { count: 0, dependencies: [], note: 'Produit introuvable.' };
      }
    }

    case 'ajouter_equipement': {
      const productId = String(args.productId ?? '');
      const product = findProduct(ctx.catalog, productId);
      if (!product) return { ok: false, error: 'Produit inconnu.' };
      const room = resolveRoom(ctx, String(args.room ?? ''));
      if (!room) return { ok: false, error: 'Pièce inconnue. Demande au visiteur dans quelle pièce.' };
      const quantity = Math.max(1, Math.floor(Number(args.quantity ?? 1)) || 1);
      ctx.actions.push({ type: 'add', productId, room, quantity });
      return { ok: true, added: { name: product.name, room, quantity, priceTTC: product.priceTTC } };
    }

    case 'retirer_equipement': {
      const productId = String(args.productId ?? '');
      const product = findProduct(ctx.catalog, productId);
      if (!product) return { ok: false, error: 'Produit inconnu.' };
      const room = resolveRoom(ctx, String(args.room ?? ''));
      if (!room) return { ok: false, error: 'Pièce inconnue.' };
      const quantity = Math.max(0, Math.floor(Number(args.quantity ?? 0)) || 0);
      ctx.actions.push({ type: 'remove', productId, room, quantity });
      return { ok: true, removed: { name: product.name, room } };
    }

    case 'ajouter_piece': {
      const label = String(args.name ?? '').trim();
      if (!label) return { ok: false, error: 'Donne un nom de pièce.' };
      const key = slugifyRoomKey(
        label,
        ctx.rooms.map((r) => r.key),
      );
      const floor =
        typeof args.floor === 'number' && Number.isFinite(args.floor)
          ? Math.trunc(args.floor)
          : undefined;
      const action: AssistantAction =
        floor === undefined
          ? { type: 'add_room', room: key, label }
          : { type: 'add_room', room: key, label, floor };
      ctx.actions.push(action);
      ctx.rooms.push(floor === undefined ? { key, label } : { key, label, floor });
      return { ok: true, room: { key, label, floor } };
    }

    case 'renommer_piece': {
      const key = resolveRoom(ctx, String(args.room ?? ''));
      if (!key) return { ok: false, error: 'Pièce inconnue.' };
      const label = String(args.name ?? '').trim();
      if (!label) return { ok: false, error: 'Donne un nouveau nom.' };
      ctx.actions.push({ type: 'rename_room', room: key, label });
      const target = ctx.rooms.find((r) => r.key === key);
      if (target) target.label = label;
      return { ok: true, room: { key, label } };
    }

    case 'changer_etage_piece': {
      const key = resolveRoom(ctx, String(args.room ?? ''));
      if (!key) return { ok: false, error: 'Pièce inconnue.' };
      const floor = Number(args.floor);
      if (!Number.isFinite(floor)) return { ok: false, error: 'Étage invalide.' };
      const value = Math.trunc(floor);
      ctx.actions.push({ type: 'set_room_floor', room: key, floor: value });
      const target = ctx.rooms.find((r) => r.key === key);
      if (target) target.floor = value;
      return { ok: true, room: { key, floor: value } };
    }

    case 'supprimer_piece': {
      const key = resolveRoom(ctx, String(args.room ?? ''));
      if (!key) return { ok: false, error: 'Pièce inconnue.' };
      ctx.actions.push({ type: 'remove_room', room: key });
      const idx = ctx.rooms.findIndex((r) => r.key === key);
      if (idx !== -1) ctx.rooms.splice(idx, 1);
      return { ok: true, removed: key };
    }

    case 'lister_pieces': {
      return {
        count: ctx.rooms.length,
        rooms: ctx.rooms.map((r) => ({ key: r.key, label: r.label, floor: r.floor ?? 0 })),
      };
    }

    case 'proposer_choix': {
      const choices = normalizeChoices(args.choices);
      ctx.choices = choices;
      return { ok: true, count: choices.length };
    }

    default:
      return { error: `Outil inconnu : ${name}` };
  }
}

export function buildCatalogDigest(catalog: SuggestProduct[]): string {
  if (catalog.length === 0) return 'Catalogue : vide pour le moment.';
  const byCategory = new Map<string, SuggestProduct[]>();
  for (const p of catalog) {
    const list = byCategory.get(p.category) ?? [];
    list.push(p);
    byCategory.set(p.category, list);
  }
  const lines = ['Catalogue disponible (catégorie exacte → produits) :'];
  for (const [category, products] of byCategory) {
    lines.push(`• ${category} :`);
    for (const p of products) {
      const brand = p.brand ? ` ${p.brand}` : '';
      lines.push(`    - ${p.name}${brand} (id: ${p.id}) — ${EUR.format(p.priceTTC)}`);
    }
  }
  return lines.join('\n');
}

export function buildContextMessage(
  input: AssistantInput,
  catalog: SuggestProduct[],
): string {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const lines: string[] = [];
  const rooms = input.rooms.length
    ? input.rooms
        .map((r) => `${r.key} (« ${r.label} », étage ${r.floor ?? 0})`)
        .join(', ')
    : 'aucune pièce déclarée pour le moment';
  lines.push(`Pièces de la maison : ${rooms}.`);
  if (input.budget) lines.push(`Budget TTC visé : ${EUR.format(input.budget)}.`);
  if (input.selection.length === 0) {
    lines.push('Panier actuel : vide.');
  } else {
    lines.push('Panier actuel :');
    for (const item of input.selection) {
      const p = byId.get(item.productId);
      const name = p ? p.name : item.productId;
      const where = item.room ? ` [${item.room}]` : '';
      lines.push(`  - ${item.quantity}× ${name}${where}`);
    }
  }
  return lines.join('\n');
}

/**
 * Génère la réponse du guide IA + les actions à appliquer au panier côté front.
 * Renvoie une réponse de repli si l'IA n'est pas configurée.
 */
export async function runConfiguratorAssistant(
  input: AssistantInput,
): Promise<AssistantReply> {
  if (!env.OPENROUTER_API_KEY) {
    return {
      reply:
        "Le guide en ligne est momentanément indisponible. Décrivez votre projet et un conseiller Neo vous aidera très vite !",
      actions: [],
      choices: [],
    };
  }

  const catalogCategories = await getConfiguratorCatalog();
  const catalog: SuggestProduct[] = catalogCategories.flatMap((cat) =>
    cat.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: cat.category,
      priceTTC: p.priceTTC,
      brand: p.brand,
    })),
  );

  const ctx: ToolContext = { catalog, rooms: input.rooms, actions: [], choices: [] };
  const client = getClient();
  const tools = buildToolDefinitions();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildCatalogDigest(catalog) },
    { role: 'system', content: buildContextMessage(input, catalog) },
    ...input.messages.map((m) => ({ role: m.role, content: m.content }) as const),
  ];

  const createTurn: CreateTurn = async (msgs) => {
    const completion = await client.chat.completions.create({
      model: env.OPENROUTER_MODEL,
      messages: msgs,
      tools,
      tool_choice: 'auto',
      temperature: 0.5,
      max_tokens: 600,
    });
    return completion.choices[0]?.message ?? null;
  };

  return runAssistantLoop(ctx, messages, createTurn);
}

/** Repli affiché quand le modèle agit mais ne formule aucune phrase. */
const FALLBACK_REPLY =
  "J'ai mis à jour votre configuration. Souhaitez-vous que je vous aide sur autre chose ?";

/** Un tour de réponse du modèle (texte éventuel + appels d'outils éventuels). */
export type AssistantTurn = Pick<
  OpenAI.Chat.Completions.ChatCompletionMessage,
  'content' | 'tool_calls'
>;

/** Produit le prochain tour du modèle à partir de l'historique courant. */
export type CreateTurn = (
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
) => Promise<AssistantTurn | null>;

/**
 * Boucle de raisonnement du guide : enchaîne les tours du modèle, exécute les
 * outils demandés, et s'arrête au premier tour sans appel d'outil.
 *
 * Subtilité (régression « Désolé, je n'ai pas pu répondre ») : le modèle écrit
 * souvent sa réponse EN MÊME TEMPS qu'un appel d'outil (ex : proposer_choix),
 * puis le tour suivant n'a plus rien à ajouter et renvoie un texte vide. On
 * mémorise donc le dernier texte non vide pour ne jamais répondre « vide ».
 */
export async function runAssistantLoop(
  ctx: ToolContext,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  createTurn: CreateTurn,
  maxIterations = 5,
): Promise<AssistantReply> {
  let lastText = '';
  for (let i = 0; i < maxIterations; i += 1) {
    const turn = await createTurn(messages);
    if (!turn) break;

    const content = (turn.content ?? '').trim();
    if (content) lastText = content;

    const toolCalls = turn.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return {
        reply: content || lastText || FALLBACK_REPLY,
        actions: ctx.actions,
        choices: ctx.choices ?? [],
      };
    }

    messages.push({ role: 'assistant', content: turn.content ?? '', tool_calls: toolCalls });
    for (const call of toolCalls) {
      if (call.type !== 'function') continue;
      const result = await runTool(ctx, call.function.name, call.function.arguments);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    reply: lastText || FALLBACK_REPLY,
    actions: ctx.actions,
    choices: ctx.choices ?? [],
  };
}
