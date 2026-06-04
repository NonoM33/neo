/**
 * Moteur de prix du configurateur public ("type IKEA").
 *
 * Fonction pure (pas d'accès DB) pour rester testable : elle reçoit la
 * sélection brute du client, le catalogue indexé par id et la liste des
 * dépendances requises manquantes (produite par
 * `products.service#checkMissingDependencies`), puis renvoie un devis
 * chiffré HT/TVA/TTC.
 */

export interface CatalogProduct {
  id: string;
  name: string;
  priceHT: number;
  tvaRate: number;
}

export interface MissingDependency {
  requiredProductId: string;
  missingQuantity: number;
  requiredProduct:
    | { id: string; name: string; priceHT: string; tvaRate: string }
    | null
    | undefined;
}

export interface PricedLine {
  productId: string;
  name: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
  totalHT: number;
  totalTTC: number;
  /** true quand la ligne a été ajoutée automatiquement par résolution de dépendance. */
  auto: boolean;
}

export interface ConfiguratorEstimate {
  lines: PricedLine[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
}

export interface SelectionItem {
  productId: string;
  quantity: number;
}

function aggregateSelection(selection: SelectionItem[]): Map<string, number> {
  const byProduct = new Map<string, number>();
  for (const item of selection) {
    if (item.quantity <= 0) continue;
    byProduct.set(item.productId, (byProduct.get(item.productId) ?? 0) + item.quantity);
  }
  return byProduct;
}

function pricedLine(
  product: CatalogProduct,
  quantity: number,
  auto: boolean,
): PricedLine {
  const totalHT = product.priceHT * quantity;
  return {
    productId: product.id,
    name: product.name,
    quantity,
    unitPriceHT: product.priceHT,
    tvaRate: product.tvaRate,
    totalHT,
    totalTTC: totalHT * (1 + product.tvaRate / 100),
    auto,
  };
}

export function computeConfiguratorEstimate(
  selection: SelectionItem[],
  catalog: Map<string, CatalogProduct>,
  missing: MissingDependency[],
): ConfiguratorEstimate {
  const lines: PricedLine[] = [];

  for (const [productId, quantity] of aggregateSelection(selection)) {
    const product = catalog.get(productId);
    if (!product) continue; // produit inconnu/inactif : ignoré silencieusement
    lines.push(pricedLine(product, quantity, false));
  }

  for (const dep of missing) {
    if (dep.missingQuantity <= 0) continue;
    const rp = dep.requiredProduct;
    if (!rp) continue;
    lines.push(
      pricedLine(
        {
          id: rp.id,
          name: rp.name,
          priceHT: parseFloat(rp.priceHT),
          tvaRate: parseFloat(rp.tvaRate),
        },
        dep.missingQuantity,
        true,
      ),
    );
  }

  let totalHT = 0;
  let totalTVA = 0;
  for (const line of lines) {
    totalHT += line.totalHT;
    totalTVA += line.totalHT * (line.tvaRate / 100);
  }

  return {
    lines,
    totalHT,
    totalTVA,
    totalTTC: totalHT + totalTVA,
  };
}
