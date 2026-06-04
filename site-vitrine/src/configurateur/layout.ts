// Placement des pièces sur le plateau : grille centrée en rangées.
// Logique pure (sans Three.js) pour rester testable.
export interface GridCell {
  x: number;
  z: number;
}

/**
 * Positions (x,z) des pièces, grille centrée sur l'origine.
 * Chaque rangée est centrée indépendamment (la dernière rangée incomplète
 * reste alignée au milieu plutôt que poussée à gauche).
 */
export function roomGridPositions(
  count: number,
  cellW = 2.15,
  cellD = 2.35,
  maxCols = 4,
): GridCell[] {
  if (count <= 0) return [];
  const cols = Math.min(maxCols, count);
  const rows = Math.ceil(count / cols);
  const cells: GridCell[] = [];
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowCount = Math.min(cols, count - row * cols);
    const x = (col - (rowCount - 1) / 2) * cellW;
    const z = (row - (rows - 1) / 2) * cellD;
    cells.push({ x, z });
  }
  return cells;
}

/** Empreinte (largeur, profondeur) du plateau pour `count` pièces. */
export function boardSize(
  count: number,
  cellW = 2.15,
  cellD = 2.35,
  maxCols = 4,
  margin = 1.1,
): { width: number; depth: number } {
  if (count <= 0) return { width: margin * 2, depth: margin * 2 };
  const cols = Math.min(maxCols, count);
  const rows = Math.ceil(count / cols);
  return {
    width: cols * cellW + margin * 2,
    depth: rows * cellD + margin * 2,
  };
}
