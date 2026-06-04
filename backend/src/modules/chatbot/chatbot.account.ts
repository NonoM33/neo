/**
 * Reconnaissance des visiteurs et création de compte client depuis le chatbot.
 *
 * Sécurité : on ne demande JAMAIS de mot de passe dans la conversation (le
 * transcript est stocké en clair et diffusé à la console staff). À la place,
 * on génère un mot de passe temporaire fort, on crée le compte, et on l'envoie
 * par email. Le mot de passe n'est jamais renvoyé au modèle ni journalisé.
 */

import { and, eq, gte, ne } from 'drizzle-orm';
import { db } from '../../config/database';
import { appointments } from '../../db/schema/appointments';
import { leads } from '../../db/schema/crm';
import { clients, clientAccounts } from '../../db/schema';
import { createAccount } from '../../support/auth/auth.service';
import { ConflictError } from '../../lib/errors';
import { splitFullName } from './chatbot.service';

const TYPE_LABELS: Record<string, string> = {
  visite_technique: 'Visite technique',
  audit: 'Audit',
  rdv_commercial: 'RDV Commercial',
};

export interface KnownAppointment {
  type: string;
  typeLabel: string;
  date: string;
  startTime: string;
  status: string;
}

export interface RecognizeResult {
  known: boolean;
  hasAccount: boolean;
  firstName: string | null;
  lastName: string | null;
  appointments: KnownAppointment[];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Génère un mot de passe temporaire fort (jamais exposé au modèle). */
export function generateTempPassword(): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/**
 * Reconnaît un visiteur à partir de son email : retrouve un éventuel client,
 * ses rendez-vous à venir et l'existence d'un compte portail.
 */
export async function recognizeVisitor(
  rawEmail: string
): Promise<RecognizeResult> {
  const email = normalizeEmail(rawEmail);

  const [client] = await db
    .select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
    })
    .from(clients)
    .where(eq(clients.email, email))
    .limit(1);

  const [account] = await db
    .select({ id: clientAccounts.id })
    .from(clientAccounts)
    .where(eq(clientAccounts.email, email))
    .limit(1);

  // Rendez-vous à venir, retrouvés via le lead rattaché (email du lead).
  const now = new Date();
  const rows = await db
    .select({
      type: appointments.type,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
    })
    .from(appointments)
    .innerJoin(leads, eq(appointments.leadId, leads.id))
    .where(
      and(
        eq(leads.email, email),
        gte(appointments.scheduledAt, now),
        ne(appointments.status, 'annule')
      )
    )
    .orderBy(appointments.scheduledAt);

  const upcoming: KnownAppointment[] = rows.map((r) => {
    const d = r.scheduledAt;
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return {
      type: r.type,
      typeLabel: TYPE_LABELS[r.type] ?? r.type,
      date,
      startTime,
      status: r.status,
    };
  });

  return {
    known: Boolean(client) || upcoming.length > 0,
    hasAccount: Boolean(account),
    firstName: client?.firstName ?? null,
    lastName: client?.lastName ?? null,
    appointments: upcoming,
  };
}

export interface CreateAccountFromChatInput {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
}

export interface CreateAccountFromChatResult {
  success: boolean;
  alreadyExists?: boolean;
  /** Mot de passe temporaire envoyé par email — JAMAIS renvoyé au modèle. */
  tempPassword?: string;
  clientFirstName?: string;
  message: string;
}

/**
 * Crée (ou retrouve) le client et lui ouvre un compte portail.
 * - Rattache les leads existants partageant cet email au client.
 * - Renvoie le mot de passe temporaire au seul appelant (pour l'email),
 *   jamais au modèle.
 */
export async function createClientAccountFromChat(
  input: CreateAccountFromChatInput
): Promise<CreateAccountFromChatResult> {
  const email = normalizeEmail(input.email ?? '');
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Email invalide.' };
  }

  // Compte déjà existant ?
  const [existingAccount] = await db
    .select({ id: clientAccounts.id })
    .from(clientAccounts)
    .where(eq(clientAccounts.email, email))
    .limit(1);
  if (existingAccount) {
    return {
      success: false,
      alreadyExists: true,
      message:
        'Un compte existe déjà avec cet email. Invite le visiteur à se connecter à son espace client.',
    };
  }

  const fromFull = input.fullName ? splitFullName(input.fullName) : null;
  const firstName =
    input.firstName?.trim() || fromFull?.firstName || 'Client';
  const lastName = input.lastName?.trim() || fromFull?.lastName || '';
  const phone = input.phone?.trim() || null;

  // Retrouver ou créer le client (contact CRM).
  let [client] = await db
    .select({ id: clients.id, firstName: clients.firstName })
    .from(clients)
    .where(eq(clients.email, email))
    .limit(1);

  if (!client) {
    const [created] = await db
      .insert(clients)
      .values({ firstName, lastName, email, phone })
      .returning({ id: clients.id, firstName: clients.firstName });
    client = created;
  }

  if (!client) {
    return { success: false, message: 'Impossible de créer la fiche client.' };
  }

  // Rattacher les leads orphelins partageant cet email.
  await db
    .update(leads)
    .set({ clientId: client.id, updatedAt: new Date() })
    .where(eq(leads.email, email));

  const tempPassword = generateTempPassword();
  try {
    await createAccount({ clientId: client.id, email, password: tempPassword });
  } catch (err) {
    if (err instanceof ConflictError) {
      return {
        success: false,
        alreadyExists: true,
        message:
          'Un compte existe déjà avec cet email. Invite le visiteur à se connecter.',
      };
    }
    throw err;
  }

  return {
    success: true,
    tempPassword,
    clientFirstName: client.firstName,
    message: 'Compte client créé.',
  };
}
