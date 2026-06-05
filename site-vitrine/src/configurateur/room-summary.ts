// Récapitulatif pur des équipements sélectionnés dans une pièce.
//
// Le configurateur stocke la sélection sous forme `qty par id de produit`. Pour
// afficher « ce qui est dans la pièce » d'un coup d'œil, on transforme cette
// map en lignes lisibles (nom, marque, quantité, prix unitaire, total ligne) et
// on calcule le sous-total. La logique est pure : aucune dépendance au DOM ni au
// catalogue distant, ce qui la rend testable en isolation.

export interface SummaryProduct {
  id: string;
  name: string;
  priceTTC: number;
  brand?: string;
  category?: string;
}

export interface RoomLine {
  id: string;
  name: string;
  brand: string;
  category: string;
  qty: number;
  unitTTC: number;
  lineTTC: number;
}

/**
 * Transforme la sélection d'une pièce en lignes d'affichage.
 *
 * @param qtyById      quantité choisie par identifiant de produit.
 * @param productsById catalogue indexé par identifiant.
 * @returns une ligne par produit réellement sélectionné (quantité > 0 et produit
 *          connu du catalogue), triée par catégorie puis par nom.
 */
export function roomLines(
  qtyById: Readonly<Record<string, number>>,
  productsById: Readonly<Record<string, SummaryProduct>>,
): RoomLine[] {
  const lines: RoomLine[] = [];
  for (const id of Object.keys(qtyById)) {
    const qty = qtyById[id];
    if (qty <= 0) continue;
    const product = productsById[id];
    if (!product) continue; // produit retiré du catalogue → on l'ignore
    lines.push({
      id,
      name: product.name,
      brand: product.brand ?? '',
      category: product.category ?? '',
      qty,
      unitTTC: product.priceTTC,
      lineTTC: product.priceTTC * qty,
    });
  }
  lines.sort((a, b) =>
    a.category === b.category
      ? a.name.localeCompare(b.name, 'fr')
      : a.category.localeCompare(b.category, 'fr'),
  );
  return lines;
}

/** Sous-total TTC d'une pièce (somme des totaux de ligne). */
export function roomSubtotal(lines: readonly RoomLine[]): number {
  return lines.reduce((sum, line) => sum + line.lineTTC, 0);
}
