import type { Client } from './client.types';
import type { Project } from './project.types';
import type { QuoteDetail } from './devis.types';
import type { CloudInstance } from './cloud.types';

export type ParcoursSignMode = 'direct' | 'remote';

/** Un besoin = un produit du catalogue rattaché à une pièce (checklist item). */
export interface ParcoursNeed {
  id: string;
  productId: string | null;
  category: string;
  label: string;
  quantity: number;
}

/** Une pièce du logement (room) avec ses équipements et ses liens. */
export interface ParcoursRoom {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  linkedRoomIds: string[];
  needs: ParcoursNeed[];
}

export interface ParcoursSignature {
  id: string;
  mode: ParcoursSignMode;
  status: string;
  signingUrl?: string;
  sentTo?: string;
}

export interface ParcoursInvoice {
  id: string;
  number: string;
  totalTTC?: string;
}

/** État complet du wizard, persisté en localStorage. */
export interface ParcoursState {
  step: number;
  client: Client | null;
  project: Project | null;
  rooms: ParcoursRoom[];
  currentRoomId: string | null;
  quote: QuoteDetail | null;
  signature: ParcoursSignature | null;
  invoice: ParcoursInvoice | null;
  instance: CloudInstance | null;
}
