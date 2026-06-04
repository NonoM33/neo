// Logique pure de gestion des pièces du configurateur.
//
// Le client compose lui-même la liste des pièces de sa maison : il active des
// pièces prédéfinies et/ou en ajoute des sur-mesure (« Bureau », « Buanderie »…).
// Ici vit tout ce qui est testable sans DOM : génération d'une clé unique à
// partir d'un nom, ajout/retrait dans la liste active.

/** Translitère un nom de pièce en clé stable (sans accent, kebab-case). */
function baseSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Construit une clé unique pour `name` qui n'entre pas en collision avec
 * `existing`. En cas de collision, suffixe `-2`, `-3`… Si le nom ne produit
 * aucun caractère exploitable, retombe sur `piece`.
 */
export function slugifyRoomKey(name: string, existing: readonly string[]): string {
  const base = baseSlug(name) || 'piece';
  if (existing.indexOf(base) === -1) return base;
  let i = 2;
  while (existing.indexOf(`${base}-${i}`) !== -1) i += 1;
  return `${base}-${i}`;
}

/** Ajoute une pièce à la liste active (sans doublon), en préservant l'ordre. */
export function addRoom(active: readonly string[], key: string): string[] {
  return active.indexOf(key) === -1 ? [...active, key] : [...active];
}

/** Retire une pièce de la liste active. */
export function removeRoom(active: readonly string[], key: string): string[] {
  return active.filter((k) => k !== key);
}
