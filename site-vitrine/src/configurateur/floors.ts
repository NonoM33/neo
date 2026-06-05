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

export interface FloorGroup {
  floor: number;
  label: string;
  rooms: RoomOnFloor[];
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
 * Regroupe les pièces par niveau, du plus haut au plus bas. L'ordre source des
 * pièces est préservé au sein de chaque étage. Un groupe RDC existe toujours.
 */
export function groupRoomsByFloor(rooms: readonly RoomOnFloor[]): FloorGroup[] {
  return floorsOf(rooms).map((floor) => ({
    floor,
    label: floorLabel(floor),
    rooms: rooms.filter((room) => levelOf(room) === floor),
  }));
}
