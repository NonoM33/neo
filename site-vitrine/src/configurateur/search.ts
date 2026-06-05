// Recherche produit pure et testable (sans DOM).
//
// Le visiteur tape une requête libre dans la barre de recherche du
// configurateur : on filtre le catalogue affiché à gauche, sans modale.
// La recherche est insensible aux accents et à la casse, et tous les mots
// saisis doivent être présents (ET logique) pour éviter le bruit.

export interface SearchableProduct {
  id: string;
  name: string;
  brand?: string;
  category: string;
}

/** Minuscule sans accent, pour comparer « Caméra » et « camera ». */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtre `products` selon `query`. Une requête vide renvoie tout le catalogue.
 * Chaque mot de la requête doit apparaître dans le nom, la marque ou la
 * catégorie du produit.
 */
export function filterProducts<T extends SearchableProduct>(
  products: readonly T[],
  query: string,
): T[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...products];
  return products.filter((p) => {
    const haystack = normalize(`${p.name} ${p.brand ?? ''} ${p.category}`);
    return terms.every((term) => haystack.includes(term));
  });
}
