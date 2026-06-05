// Modèle pur des étages du configurateur.
//
// Une pièce vit sur un niveau : `floor` entier où 0 = rez-de-chaussée,
// les positifs montent (Étage 1, 2…) et les négatifs descendent (Sous-sol 1…).
// Une pièce sans `floor` est considérée au RDC. Ce module n'a aucune dépendance
// DOM ni Three.js : il dérive la liste ordonnée des étages et regroupe les
// pièces par niveau pour alimenter aussi bien l'UI que le moteur 3D.

export interface RoomOnFloor {
  key: string;
  floor?: number;
}

export interface FloorGroup<T extends RoomOnFloor = RoomOnFloor> {
  floor: number;
  label: string;
  rooms: T[];
}

/** Niveau normalisé d'une pièce (absent → RDC). */
function levelOf(room: RoomOnFloor): number {
  return room.floor ?? 0;
}

/** Libellé humain d'un niveau : « RDC », « Étage n », « Sous-sol n ». */
export function floorLabel(floor: number): string {
  if (floor === 0) return 'RDC';
  if (floor < 0) return `Sous-sol ${Math.abs(floor)}`;
  return `Étage ${floor}`;
}

/**
 * Liste des niveaux présents, du plus haut au plus bas. Le RDC (0) est toujours
 * inclus, même si aucune pièce n'y vit, pour servir de socle stable à la 3D.
 */
export function floorsOf(rooms: readonly RoomOnFloor[]): number[] {
  const levels = new Set<number>([0]);
  for (const room of rooms) levels.add(levelOf(room));
  return [...levels].sort((a, b) => b - a);
}

/**
 * Niveaux à proposer dans le sélecteur « Ajouter une pièce », du haut vers le
 * bas. On part des niveaux présents et du niveau visé (`pendingFloor`), puis on
 * offre toujours un cran de plus en haut et en bas : ainsi, sélectionner
 * « Étage 1 + » débloque aussitôt « Étage 2 + », et de même vers les sous-sols.
 * La plage est rendue contiguë pour ne jamais laisser de niveau intermédiaire
 * inaccessible.
 */
export function floorPickerOptions(
  presentFloors: readonly number[],
  pendingFloor: number,
): number[] {
  const levels = [...presentFloors, pendingFloor, 0];
  const top = Math.max(...levels) + 1;
  const bottom = Math.min(...levels) - 1;
  const options: number[] = [];
  for (let f = top; f >= bottom; f -= 1) options.push(f);
  return options;
}

/**
 * Regroupe les pièces par niveau, du plus haut au plus bas. L'ordre source des
 * pièces est préservé au sein de chaque étage. Un groupe RDC existe toujours.
 */
export function groupRoomsByFloor<T extends RoomOnFloor>(
  rooms: readonly T[],
): FloorGroup<T>[] {
  return floorsOf(rooms).map((floor) => ({
    floor,
    label: floorLabel(floor),
    rooms: rooms.filter((room) => levelOf(room) === floor),
  }));
}
