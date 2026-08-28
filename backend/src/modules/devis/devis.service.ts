import { and, count, eq, inArray } from 'drizzle-orm';
import { CALL_US_SENTENCE } from '../../config/contact';
import { db } from '../../config/database';
import { leads } from '../../db/schema/crm';
import { users, roles, userRoles } from '../../db/schema/users';
import {
  BUDGET_ESTIMATED_VALUE,
  BUDGET_LABELS,
  CONTACT_TIME_LABELS,
  HOUSING_LABELS,
  NEED_LABELS,
  OWNERSHIP_LABELS,
  PROJECT_KIND_LABELS,
  TIMELINE_LABELS,
  type PublicDevisInput,
} from './devis.schema';

// Réponse renvoyée au site vitrine, affichée telle quelle sur l'écran de succès.
export const DEVIS_CONFIRMATION_MESSAGE =
  'Votre demande de devis a bien été enregistrée. Un conseiller vous recontacte sous 24h. ' +
  CALL_US_SENTENCE;

// Statuts de leads considérés comme "ouverts" (pour répartir la charge).
const OPEN_LEAD_STATUSES = [
  'prospect',
  'qualifie',
  'proposition',
  'negociation',
] as const;

/**
 * Construit un résumé lisible du questionnaire de devis,
 * destiné au champ `description` du lead CRM.
 */
export function buildDevisDescription(input: PublicDevisInput): string {
  const lines: string[] = ['Demande de devis depuis le site web.', ''];

  lines.push(`Logement : ${HOUSING_LABELS[input.housingType]}`);
  if (input.ownership) lines.push(`Statut : ${OWNERSHIP_LABELS[input.ownership]}`);
  if (input.projectKind)
    lines.push(`Type de projet : ${PROJECT_KIND_LABELS[input.projectKind]}`);
  if (input.surface) lines.push(`Surface : ${input.surface} m²`);
  if (input.rooms) lines.push(`Nombre de pièces : ${input.rooms}`);

  if (input.needs.length > 0) {
    lines.push('');
    lines.push('Besoins :');
    for (const need of input.needs) lines.push(`  • ${NEED_LABELS[need]}`);
  }

  lines.push('');
  if (input.budget) lines.push(`Budget : ${BUDGET_LABELS[input.budget]}`);
  if (input.timeline) lines.push(`Délai : ${TIMELINE_LABELS[input.timeline]}`);
  if (input.contactTime)
    lines.push(`Disponibilité : ${CONTACT_TIME_LABELS[input.contactTime]}`);

  if (input.message) {
    lines.push('');
    lines.push(`Message : ${input.message}`);
  }

  return lines.join('\n');
}

export interface DevisLeadValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  description: string;
  status: 'prospect';
  source: 'site_web';
  ownerId: string;
  address: string | null;
  city: string | null;
  postalCode: string;
  surface: string | null;
  estimatedValue: string | null;
}

/**
 * Mappe le questionnaire vers les valeurs d'insertion d'un lead CRM.
 * Fonction pure (pas d'accès DB) pour faciliter le test.
 */
export function buildDevisLeadValues(
  input: PublicDevisInput,
  ownerId: string
): DevisLeadValues {
  const estimated =
    input.budget != null ? BUDGET_ESTIMATED_VALUE[input.budget] : null;

  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    title: `Demande de devis — ${HOUSING_LABELS[input.housingType]}`,
    description: buildDevisDescription(input),
    status: 'prospect',
    source: 'site_web',
    ownerId,
    address: input.address ?? null,
    city: input.city ?? null,
    postalCode: input.postalCode,
    surface: input.surface != null ? String(input.surface) : null,
    estimatedValue: estimated != null ? String(estimated) : null,
  };
}

/**
 * Sélectionne le commercial actif le moins chargé (par nombre de leads
 * ouverts). À défaut de commercial, retombe sur un admin actif, puis sur
 * n'importe quel utilisateur actif.
 */
export async function resolveDevisOwner(): Promise<string | null> {
  const commercialRows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(and(eq(roles.name, 'commercial'), eq(users.isActive, true)));

  let candidateIds = [...new Set(commercialRows.map((r) => r.userId))];

  if (candidateIds.length === 0) {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.isActive, true)));
    candidateIds = admins.map((a) => a.id);
  }

  if (candidateIds.length === 0) {
    const [anyUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true))
      .limit(1);
    return anyUser?.id ?? null;
  }

  // Charge actuelle (leads ouverts) par candidat.
  const loadRows = await db
    .select({ ownerId: leads.ownerId, n: count() })
    .from(leads)
    .where(
      and(
        inArray(leads.ownerId, candidateIds),
        inArray(leads.status, [...OPEN_LEAD_STATUSES])
      )
    )
    .groupBy(leads.ownerId);

  const loadByOwner = new Map<string, number>();
  for (const row of loadRows) loadByOwner.set(row.ownerId, Number(row.n));

  return pickLeastBusyOwner(candidateIds, loadByOwner);
}

/**
 * Choisit le propriétaire le moins chargé. Les égalités sont départagées
 * aléatoirement pour répartir la charge. Fonction pure (testable).
 */
export function pickLeastBusyOwner(
  candidateIds: string[],
  loadByOwner: Map<string, number>
): string | null {
  if (candidateIds.length === 0) return null;

  let minLoad = Infinity;
  const leastBusy: string[] = [];
  for (const id of candidateIds) {
    const load = loadByOwner.get(id) ?? 0;
    if (load < minLoad) {
      minLoad = load;
      leastBusy.length = 0;
      leastBusy.push(id);
    } else if (load === minLoad) {
      leastBusy.push(id);
    }
  }

  return leastBusy[Math.floor(Math.random() * leastBusy.length)] ?? null;
}

export async function createDevisRequest(input: PublicDevisInput) {
  // ── Honeypot : on simule un succès pour piéger les bots ──────────────────
  if (input.website && input.website.length > 0) {
    return {
      success: true,
      message: 'Votre demande de devis a bien été enregistrée.',
    };
  }

  const ownerId = await resolveDevisOwner();
  if (!ownerId) {
    throw new Error('Aucun conseiller disponible pour traiter votre demande.');
  }

  const values = buildDevisLeadValues(input, ownerId);

  const [lead] = await db.insert(leads).values(values).returning();
  if (!lead) {
    throw new Error('Erreur lors de la création de la demande de devis.');
  }

  return {
    success: true,
    message: DEVIS_CONFIRMATION_MESSAGE,
  };
}
