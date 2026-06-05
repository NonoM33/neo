/**
 * Build a draft quote from the checklist items of a project.
 *
 * Goal: when the auditor finishes their on-site checklist, one tap should
 * produce a quote pre-filled with sensible product suggestions — they only
 * need to adjust quantities and send. This is the cornerstone of "vendre
 * de A à Z" for the field team.
 *
 * Matching strategy (fuzzy, no extra table required):
 *   1. Tokenize the checklist label (e.g. "Plafonnier connecté Wifi" →
 *      ["plafonnier", "connecté", "wifi"]).
 *   2. Score each active product on token hits against name + description.
 *   3. Filter to the matching ProductCategory (mapped from the checklist
 *      category) so we don't suggest a doorbell for a lighting item.
 *   4. Take the top-scoring product per item; fall back to "any product in
 *      the category" when no token matches; mark unmatched items as
 *      manual lines so the salesperson sees what still needs attention.
 *
 * Returns the freshly-created quote (passes through createQuote so totals
 * and cost snapshots stay consistent).
 */

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  projects,
  rooms,
  checklistItems,
  products,
  type Product,
} from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { createQuote } from './quotes.service';

// ─── Category mapping ────────────────────────────────────────────────────
// Checklist categories (French enum from the app) → product categories
// stored in the products table. Both sides use loose strings, so the map
// is just a normalization layer.

const CATEGORY_MAP: Record<string, string[]> = {
  eclairage: ['eclairage', 'éclairage'],
  ouvrants: ['ouvrants', 'volets'],
  climat: ['climat', 'chauffage'],
  securite: ['securite', 'sécurité'],
  energie: ['energie', 'réseau'],
  multimedia: ['multimedia', 'audio'],
  infrastructure: ['infrastructure', 'réseau'],
  reseau: ['reseau', 'réseau'],
  chauffage: ['chauffage', 'climat'],
  autre: [],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length >= 3); // drop noise ("le", "de", "et")
}

interface ScoredProduct {
  product: Product;
  score: number;
}

function scoreProduct(p: Product, tokens: string[]): number {
  const haystack = normalize(`${p.name} ${p.description ?? ''}`);
  let score = 0;
  for (const t of tokens) {
    if (haystack.includes(t)) score += 2;
    // Bonus when the token starts a word in the name
    if (new RegExp(`\\b${t}`).test(haystack)) score += 1;
  }
  return score;
}

function pickBestProduct(
  candidates: Product[],
  tokens: string[],
): Product | null {
  if (!candidates.length) return null;
  const scored: ScoredProduct[] = candidates.map((product) => ({
    product,
    score: scoreProduct(product, tokens),
  }));
  scored.sort((a, b) => b.score - a.score);
  // If even the best candidate scored 0, fall back to "any in category"
  // so the salesperson at least gets a starting point — but only when the
  // pool is small (otherwise it's noise).
  if (scored[0]!.score === 0 && candidates.length > 6) return null;
  return scored[0]!.product;
}

// ─── Pure line resolution (unit-testable, no DB) ─────────────────────────

export interface DraftLine {
  productId?: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
  clientOwned: boolean;
}

export interface ChecklistLineItem {
  id: string;
  label: string;
  category: string;
  /** Explicit product chosen in the wizard catalogue (overrides fuzzy match). */
  productId?: string | null;
  /** Quantity chosen in the wizard (defaults to 1). */
  quantity?: number | null;
}

/**
 * Decide which product (and at which quantity) a single checklist item maps to.
 *
 * Priority:
 *   1. An explicit `productId` picked in the catalogue → used verbatim with the
 *      item's quantity (no fuzzy matching, no guessing).
 *   2. Otherwise fall back to category + token fuzzy matching.
 *   3. If nothing matches, emit a manual "[À compléter]" line at price 0.
 *
 * Always honours `item.quantity` (>= 1).
 */
export function resolveChecklistLine(
  item: ChecklistLineItem,
  catalogue: Product[],
  byId: Map<string, Product>,
  byCategory: Map<string, Product[]>,
): { line: DraftLine; match: ChecklistMatch } {
  const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;

  const chosen =
    item.productId && byId.has(item.productId) ? byId.get(item.productId)! : null;

  const best =
    chosen ??
    (() => {
      const tokens = tokenize(item.label);
      const catAliases = CATEGORY_MAP[normalize(item.category)] ?? [
        normalize(item.category),
      ];
      const candidates: Product[] = [];
      for (const alias of catAliases) {
        const bucket = byCategory.get(normalize(alias));
        if (bucket) candidates.push(...bucket);
      }
      const pool = candidates.length ? candidates : catalogue;
      return pickBestProduct(pool, tokens);
    })();

  if (best) {
    return {
      line: {
        productId: best.id,
        description: best.name,
        quantity: qty,
        unitPriceHT: parseFloat(best.priceHT),
        tvaRate: parseFloat(best.tvaRate),
        clientOwned: false,
      },
      match: {
        checklistItemId: item.id,
        label: item.label,
        category: item.category,
        matchedProductId: best.id,
        matchedProductName: best.name,
      },
    };
  }

  return {
    line: {
      description: `[À compléter] ${item.label}`,
      quantity: qty,
      unitPriceHT: 0,
      tvaRate: 20,
      clientOwned: false,
    },
    match: {
      checklistItemId: item.id,
      label: item.label,
      category: item.category,
      matchedProductId: null,
      matchedProductName: null,
    },
  };
}

// ─── Public entry point ──────────────────────────────────────────────────

export interface QuoteFromChecklistInput {
  projectId: string;
  /** Optional: only consider these rooms. Defaults to all rooms of the project. */
  roomIds?: string[];
  /** Optional discount HT applied to the resulting quote. */
  discount?: number;
  /** Optional sales notes copied into the quote. */
  notes?: string;
  /** Optional days-of-validity for the new quote. */
  validityDays?: number;
}

export interface ChecklistMatch {
  checklistItemId: string;
  label: string;
  category: string;
  /** null when no product matched — salesperson must complete manually. */
  matchedProductId: string | null;
  matchedProductName: string | null;
}

export async function createQuoteFromChecklist(
  input: QuoteFromChecklistInput,
  userId: string,
  userRole: string,
): Promise<{ quoteId: string; matches: ChecklistMatch[] }> {
  // ── 1. Verify project access (admin or owner) ──────────────────────
  const projectConditions = [eq(projects.id, input.projectId)];
  if (userRole !== 'admin') {
    projectConditions.push(eq(projects.userId, userId));
  }
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(...projectConditions))
    .limit(1);
  if (!project) throw new NotFoundError('Projet');

  // ── 2. Load rooms + checked checklist items ────────────────────────
  const projectRooms = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.projectId, input.projectId));

  const roomIdsAll = projectRooms.map((r) => r.id);
  const roomIdsFilter =
    input.roomIds && input.roomIds.length
      ? input.roomIds.filter((id) => roomIdsAll.includes(id))
      : roomIdsAll;

  if (!roomIdsFilter.length) {
    throw new NotFoundError('Aucune pièce trouvée pour ce projet');
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(
      and(
        inArray(checklistItems.roomId, roomIdsFilter),
        eq(checklistItems.checked, true),
      ),
    );

  if (!items.length) {
    throw new NotFoundError(
      "Aucun item coché dans la checklist — rien à devisater",
    );
  }

  // ── 3. Load the active product catalogue once ──────────────────────
  const catalogue = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true));

  // Index by normalized category for fast filtering
  const byCategory = new Map<string, Product[]>();
  for (const p of catalogue) {
    const key = normalize(p.category);
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }

  // ── 4. Match each checklist item to a product ──────────────────────
  // Index the catalogue by id so explicitly-chosen products are used verbatim.
  const byId = new Map<string, Product>();
  for (const p of catalogue) byId.set(p.id, p);

  const matches: ChecklistMatch[] = [];
  const draftLines: Array<DraftLine & { sortOrder: number }> = [];

  let sortOrder = 0;
  for (const item of items) {
    const { line, match } = resolveChecklistLine(item, catalogue, byId, byCategory);
    draftLines.push({ ...line, sortOrder: sortOrder++ });
    matches.push(match);
  }

  // ── 5. Defer to the regular createQuote() so totals/cost snapshots
  //      stay consistent with manually-created quotes.
  const quote = await createQuote(
    input.projectId,
    {
      lines: draftLines,
      discount: input.discount ?? 0,
      notes: input.notes,
      validUntil:
        input.validityDays !== undefined
          ? new Date(Date.now() + input.validityDays * 86400 * 1000)
          : undefined,
    },
    userId,
    userRole,
  );

  return { quoteId: quote.id ?? '', matches };
}
