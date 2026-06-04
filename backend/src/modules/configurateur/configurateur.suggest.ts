// Logique pure du guide IA du configurateur.
//
// Tout ce qui est calculable sans LLM ni base de données vit ici, et est testé :
// proposer des alternatives moins chères dans la même catégorie, situer un total
// par rapport à un budget, et résumer une dépendance (pourquoi un bridge ?).

/** Produit du catalogue, aplati pour le moteur de suggestion. */
export interface SuggestProduct {
  id: string;
  name: string;
  category: string;
  priceTTC: number;
  brand?: string | null;
}

/** Alternative moins chère proposée pour un produit donné. */
export interface Alternative {
  id: string;
  name: string;
  category: string;
  priceTTC: number;
  brand?: string | null;
  savingTTC: number;
}

export interface CheaperOptions {
  /** Nombre maximum d'alternatives renvoyées (défaut 3). */
  limit?: number;
  /** Prix TTC à ne pas dépasser (filtre supplémentaire). */
  maxPriceTTC?: number;
}

/**
 * Alternatives moins chères que `productId`, dans la même catégorie, triées du
 * moins cher au plus cher. Le produit cible lui-même est exclu. Renvoie `[]` si
 * le produit est introuvable.
 */
export function cheaperAlternatives(
  catalog: readonly SuggestProduct[],
  productId: string,
  opts: CheaperOptions = {},
): Alternative[] {
  const target = catalog.find((p) => p.id === productId);
  if (!target) return [];
  const limit = opts.limit ?? 3;
  return catalog
    .filter(
      (p) =>
        p.id !== target.id &&
        p.category === target.category &&
        p.priceTTC < target.priceTTC &&
        (opts.maxPriceTTC == null || p.priceTTC <= opts.maxPriceTTC),
    )
    .sort((a, b) => a.priceTTC - b.priceTTC)
    .slice(0, Math.max(0, limit))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      priceTTC: p.priceTTC,
      brand: p.brand ?? null,
      savingTTC: round2(target.priceTTC - p.priceTTC),
    }));
}

export interface BudgetStatus {
  /** `true` si le total tient dans le budget (ou si aucun budget fourni). */
  within: boolean;
  /** Montant TTC au-dessus du budget (0 si dans le budget ou sans budget). */
  overBy: number;
  /** Marge TTC restante avant d'atteindre le budget (0 si dépassé/sans budget). */
  remaining: number;
}

/** Situe un total TTC par rapport à un budget optionnel. */
export function budgetStatus(totalTTC: number, budget?: number | null): BudgetStatus {
  if (budget == null || budget <= 0) {
    return { within: true, overBy: 0, remaining: 0 };
  }
  const diff = round2(totalTTC - budget);
  return {
    within: diff <= 0,
    overBy: diff > 0 ? diff : 0,
    remaining: diff < 0 ? round2(-diff) : 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
