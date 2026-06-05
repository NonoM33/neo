// Logique pure du « Pack essentiel » du configurateur.
//
// Quand une pièce est vide, on propose au client de la remplir en un clic avec
// une sélection de démarrage pertinente. Comme le catalogue réel vient de l'API
// (les identifiants produits ne sont pas connus à l'avance), on ne peut pas
// coder en dur une liste de produits : on construit le pack à partir des
// catégories « favorites » de la pièce et du catalogue courant.
//
// Règle métier : pour chacune des premières catégories favorites de la pièce,
// on prend le premier produit facturable (prix > 0) de cette catégorie, avec
// une quantité par défaut propre à la catégorie (l'éclairage se pose en
// plusieurs points, une serrure est unique, etc.). On s'arrête une fois
// `maxItems` lignes constituées pour rester un pack « essentiel », pas une
// maison complète.

export interface PackProduct {
  id: string;
  priceTTC: number;
}

export interface PackItem {
  id: string;
  qty: number;
}

/**
 * Construit le pack essentiel d'une pièce.
 *
 * @param favoriteCats  catégories favorites de la pièce, dans l'ordre de priorité.
 * @param productsByCat catalogue indexé par catégorie.
 * @param qtyByCat      quantité par défaut par catégorie (défaut 1 si absente).
 * @param maxItems      nombre maximum de lignes dans le pack (défaut 3).
 */
export function essentialPack(
  favoriteCats: readonly string[],
  productsByCat: Readonly<Record<string, readonly PackProduct[]>>,
  qtyByCat: Readonly<Record<string, number>> = {},
  maxItems = 3,
): PackItem[] {
  const items: PackItem[] = [];
  for (const cat of favoriteCats) {
    if (items.length >= maxItems) break;
    const billable = (productsByCat[cat] ?? []).filter((p) => p.priceTTC > 0);
    if (billable.length === 0) continue;
    const qty = qtyByCat[cat] ?? 1;
    if (qty <= 0) continue;
    items.push({ id: billable[0].id, qty });
  }
  return items;
}
