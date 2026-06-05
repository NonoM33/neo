// Pile d'annulation/rétablissement (undo/redo) générique et pure.
//
// On modélise l'historique comme une liste d'instantanés (`snapshots`) et un
// curseur (`index`) pointant sur l'état courant. Annuler recule le curseur,
// rétablir l'avance, et committer un nouvel état tronque le futur (les
// rétablissements deviennent caduques dès qu'on repart d'un état antérieur).
//
// Le type de l'instantané est laissé au générique `T` : le configurateur y
// stocke une copie sérialisable de la sélection et des pièces. La pile ne sait
// rien du DOM ni du métier, ce qui la rend testable en isolation.

export interface History<T> {
  snapshots: readonly T[];
  index: number;
}

/** Crée une pile initialisée avec le premier état courant. */
export function createHistory<T>(initial: T): History<T> {
  return { snapshots: [initial], index: 0 };
}

/**
 * Enregistre un nouvel état. Tronque tout « futur » au-delà du curseur, puis
 * empile l'instantané et déplace le curseur dessus. `limit` borne la taille de
 * la pile (les plus anciens états sont oubliés).
 */
export function pushHistory<T>(history: History<T>, snapshot: T, limit = 50): History<T> {
  const kept = history.snapshots.slice(0, history.index + 1);
  const snapshots = [...kept, snapshot];
  if (snapshots.length > limit) {
    const overflow = snapshots.length - limit;
    return { snapshots: snapshots.slice(overflow), index: snapshots.length - overflow - 1 };
  }
  return { snapshots, index: snapshots.length - 1 };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.index > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.index < history.snapshots.length - 1;
}

/** Recule le curseur d'un cran si possible (sinon renvoie la pile inchangée). */
export function undo<T>(history: History<T>): History<T> {
  return canUndo(history) ? { ...history, index: history.index - 1 } : history;
}

/** Avance le curseur d'un cran si possible (sinon renvoie la pile inchangée). */
export function redo<T>(history: History<T>): History<T> {
  return canRedo(history) ? { ...history, index: history.index + 1 } : history;
}

/** Instantané courant pointé par le curseur. */
export function current<T>(history: History<T>): T {
  return history.snapshots[history.index];
}
