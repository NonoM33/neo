import { describe, it, expect } from 'bun:test';
import {
  createHistory,
  pushHistory,
  canUndo,
  canRedo,
  undo,
  redo,
  current,
} from './history';

describe('history (undo/redo)', () => {
  it('démarre sur l’état initial, sans annulation ni rétablissement possible', () => {
    const h = createHistory('a');
    expect(current(h)).toBe('a');
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('empile des états et permet d’annuler vers le précédent', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    expect(current(h)).toBe('c');
    expect(canUndo(h)).toBe(true);
    h = undo(h);
    expect(current(h)).toBe('b');
    h = undo(h);
    expect(current(h)).toBe('a');
    expect(canUndo(h)).toBe(false);
  });

  it('permet de rétablir après une annulation', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = undo(h);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(current(h)).toBe('b');
    expect(canRedo(h)).toBe(false);
  });

  it('tronque le futur quand on committe après une annulation', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    h = undo(h); // → b
    h = pushHistory(h, 'd'); // écrase c
    expect(current(h)).toBe('d');
    expect(canRedo(h)).toBe(false);
    h = undo(h);
    expect(current(h)).toBe('b');
  });

  it('ne bouge pas quand on annule/rétablit en butée', () => {
    const h = createHistory('a');
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('borne la taille de la pile et oublie les plus anciens états', () => {
    let h = createHistory('s0');
    for (let i = 1; i <= 5; i += 1) h = pushHistory(h, 's' + i, 3);
    // limite 3 : on garde les 3 derniers (s3, s4, s5), curseur sur s5
    expect(h.snapshots.length).toBe(3);
    expect(current(h)).toBe('s5');
    h = undo(h);
    h = undo(h);
    expect(current(h)).toBe('s3');
    expect(canUndo(h)).toBe(false);
  });
});
