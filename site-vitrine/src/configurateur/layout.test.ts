import { describe, expect, it } from 'bun:test';
import { boardSize, roomGridPositions } from './layout';

describe('roomGridPositions', () => {
  it('renvoie une liste vide pour 0 pièce', () => {
    expect(roomGridPositions(0)).toEqual([]);
  });

  it('centre une rangée unique sur x=0', () => {
    const cells = roomGridPositions(3, 2, 2, 4);
    expect(cells).toHaveLength(3);
    const xs = cells.map((c) => c.x);
    expect(xs).toEqual([-2, 0, 2]);
    // une seule rangée => z identique et centré
    expect(new Set(cells.map((c) => c.z)).size).toBe(1);
    expect(cells[0].z).toBe(0);
  });

  it('centre la grille autour de l’origine (somme des x ~ 0)', () => {
    const cells = roomGridPositions(7);
    const sumX = cells.reduce((acc, c) => acc + c.x, 0);
    expect(Math.abs(sumX)).toBeLessThan(1e-9);
  });

  it('répartit 7 pièces sur 2 rangées (4 + 3) et centre la rangée incomplète', () => {
    const cells = roomGridPositions(7, 2, 2, 4);
    const firstRow = cells.slice(0, 4);
    const secondRow = cells.slice(4);
    expect(secondRow).toHaveLength(3);
    // rangée pleine : 4 colonnes centrées
    expect(firstRow.map((c) => c.x)).toEqual([-3, -1, 1, 3]);
    // rangée incomplète : 3 colonnes recentrées (pas alignées à gauche)
    expect(secondRow.map((c) => c.x)).toEqual([-2, 0, 2]);
    // deux z distincts, symétriques
    const zRow1 = firstRow[0].z;
    const zRow2 = secondRow[0].z;
    expect(zRow1).toBeCloseTo(-zRow2, 9);
  });

  it('boardSize grandit avec le nombre de rangées', () => {
    const one = boardSize(4);
    const two = boardSize(7);
    expect(two.depth).toBeGreaterThan(one.depth);
    expect(two.width).toBeCloseTo(one.width, 9);
  });
});
