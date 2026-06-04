// Logique pure du glisser-déposer « équipement → pièce 3D ».
//
// Le client fait glisser une vignette d'équipement (palette) sur une pièce de
// la maison 3D pour l'ajouter à cette pièce. Tout ce qui est testable sans DOM
// ni Three.js vit ici : validité du dépôt, construction de la palette, et la
// décision « ce geste est-il un drag (vers la maison) ou un scroll horizontal
// de la palette ? ».

export interface PaletteProduct {
  id: string;
  name: string;
  priceTTC: number;
  category: string;
  brand?: string;
  imageUrl?: string;
}

/** Une pièce accepte un équipement si sa catégorie fait partie des catégories de la pièce. */
export function roomAcceptsCategory(roomCats: readonly string[], category: string): boolean {
  return roomCats.indexOf(category) !== -1;
}

/**
 * Construit la palette à partir du catalogue groupé par catégorie : au plus
 * `perCategory` produits par catégorie, dans l'ordre des catégories puis par
 * prix croissant (les « petits » équipements d'abord, plus engageants).
 */
export function paletteItems(
  productsByCat: Record<string, PaletteProduct[]>,
  perCategory: number,
): PaletteProduct[] {
  const out: PaletteProduct[] = [];
  Object.keys(productsByCat).forEach((cat) => {
    const sorted = (productsByCat[cat] || []).slice().sort((a, b) => a.priceTTC - b.priceTTC);
    sorted.slice(0, Math.max(0, perCategory)).forEach((p) => out.push(p));
  });
  return out;
}

export type Gesture = 'drag' | 'scroll' | 'pending';

/**
 * Décide la nature du geste à partir du déplacement depuis le point de départ.
 * - vertical dominant et franchi → `drag` (l'utilisateur monte vers la maison) ;
 * - horizontal dominant et franchi → `scroll` (il fait défiler la palette) ;
 * - sous le seuil → `pending` (on ne tranche pas encore).
 */
export function gestureFromDelta(dx: number, dy: number, threshold: number): Gesture {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < threshold && ay < threshold) return 'pending';
  return ay >= ax ? 'drag' : 'scroll';
}
