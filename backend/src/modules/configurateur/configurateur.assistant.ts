import OpenAI from 'openai';
import { env } from '../../config/env';
import { getConfiguratorCatalog } from './configurateur.service';
import { getProductDependencies } from '../products/products.service';
import { cheaperAlternatives, type SuggestProduct } from './configurateur.suggest';
import type {
  AssistantAction,
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
- Tu peux AGIR sur le panier : ajoute ou retire des équipements toi-même quand le visiteur est d'accord.

Style :
- Réponds en français, ton amical et concret, 1 à 4 phrases. Pas de jargon inutile.
- Le catalogue exact (catégories, références et prix) t'est fourni ci-dessous : appuie-toi dessus, n'invente aucune référence ni aucun prix.
- Utilise EXACTEMENT les noms de catégorie du catalogue fourni (ex : « Sécurité » pour les caméras, « Éclairage », « Volets »…), pas des mots-clés inventés.
- Avant d'ajouter un équipement, assure-toi d'avoir une pièce de destination valide (utilise la liste des pièces fournie).
- Quand tu ajoutes/retires quelque chose, dis-le clairement et explique pourquoi en une phrase.

Outils :
- "rechercher_produits" : explore le catalogue (par catégorie, mot-clé, prix max).
- "alternatives_moins_cheres" : trouve des équivalents moins chers d'un produit.
- "expliquer_dependances" : liste ce qu'un produit requiert (bridge, etc.) et pourquoi.
- "ajouter_equipement" / "retirer_equipement" : modifient le panier du visiteur.`;

export interface ToolContext {
  catalog: SuggestProduct[];
  rooms: AssistantInput['rooms'];
  actions: AssistantAction[];
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
  ];
}

function findProduct(catalog: SuggestProduct[], id: string): SuggestProduct | undefined {
  return catalog.find((p) => p.id === id);
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
    ? input.rooms.map((r) => `${r.key} (« ${r.label} »)`).join(', ')
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

  const ctx: ToolContext = { catalog, rooms: input.rooms, actions: [] };
  const client = getClient();
  const tools = buildToolDefinitions();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildCatalogDigest(catalog) },
    { role: 'system', content: buildContextMessage(input, catalog) },
    ...input.messages.map((m) => ({ role: m.role, content: m.content }) as const),
  ];

  for (let i = 0; i < 5; i += 1) {
    const completion = await client.chat.completions.create({
      model: env.OPENROUTER_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.5,
      max_tokens: 600,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    const toolCalls = choice.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { reply: (choice.content ?? '').trim(), actions: ctx.actions };
    }

    messages.push(choice);
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
    reply:
      "J'ai mis à jour votre configuration. Souhaitez-vous que je vous aide sur autre chose ?",
    actions: ctx.actions,
  };
}
