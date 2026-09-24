import type { ParcoursRoom, ParcoursState } from '../../types/parcours.types';

/** Contrat partagé par toutes les étapes du wizard. */
export interface StepProps {
  state: ParcoursState;
  patch: (partial: Partial<ParcoursState>) => void;
  next: () => void;
  back: () => void;
  reset: () => void;
}

export const ROOM_PRESETS: { type: string; name: string }[] = [
  { type: 'salon', name: 'Salon' },
  { type: 'cuisine', name: 'Cuisine' },
  { type: 'chambre', name: 'Chambre' },
  { type: 'salle_de_bain', name: 'Salle de bain' },
  { type: 'toilette', name: 'Toilette' },
  { type: 'entree', name: 'Entrée' },
  { type: 'dressing', name: 'Dressing' },
  { type: 'bureau', name: 'Bureau' },
  { type: 'garage', name: 'Garage' },
  { type: 'exterieur', name: 'Extérieur' },
  { type: 'autre', name: 'Autre' },
];

export const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function fmtEUR(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return euro.format(Number.isFinite(n) ? (n as number) : 0);
}

export function roomTotalQty(room: ParcoursRoom): number {
  return (room.needs ?? []).reduce((sum, n) => sum + (n.quantity || 1), 0);
}

export function auditTotalQty(rooms: ParcoursRoom[]): number {
  return rooms.reduce((sum, r) => sum + roomTotalQty(r), 0);
}
