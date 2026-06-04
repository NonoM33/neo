import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  chatbotSessions,
  chatbotMessages,
  leads,
  users,
  type ChatbotSession,
  type ChatbotMessage,
} from '../../db/schema';

export type ChatbotMessageRole = 'visitor' | 'bot' | 'staff' | 'system';

const ACTIVE_SESSION_LIST_LIMIT = 50;

/**
 * Récupère la session active correspondant au visiteur, ou en crée une nouvelle.
 * Une session "active" peut être reprise après un rechargement de page.
 */
export async function getOrCreateSession(input: {
  visitorId: string;
  pageUrl?: string;
  userAgent?: string;
}): Promise<ChatbotSession> {
  const [existing] = await db
    .select()
    .from(chatbotSessions)
    .where(
      and(
        eq(chatbotSessions.visitorId, input.visitorId),
        eq(chatbotSessions.status, 'active')
      )
    )
    .orderBy(desc(chatbotSessions.lastMessageAt))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(chatbotSessions)
    .values({
      visitorId: input.visitorId,
      pageUrl: input.pageUrl,
      userAgent: input.userAgent,
    })
    .returning();

  if (!created) throw new Error('Échec de la création de la session chatbot');
  return created;
}

export async function getSession(
  sessionId: string
): Promise<ChatbotSession | null> {
  const [session] = await db
    .select()
    .from(chatbotSessions)
    .where(eq(chatbotSessions.id, sessionId))
    .limit(1);
  return session ?? null;
}

export async function getMessages(sessionId: string): Promise<ChatbotMessage[]> {
  return db
    .select()
    .from(chatbotMessages)
    .where(eq(chatbotMessages.sessionId, sessionId))
    .orderBy(asc(chatbotMessages.createdAt));
}

export async function addMessage(
  sessionId: string,
  role: ChatbotMessageRole,
  content: string,
  authorStaffId?: string
): Promise<ChatbotMessage> {
  const [message] = await db
    .insert(chatbotMessages)
    .values({ sessionId, role, content, authorStaffId })
    .returning();

  if (!message) throw new Error('Échec de la création du message chatbot');

  // Un message visiteur incrémente le compteur non-lu côté staff.
  await db
    .update(chatbotSessions)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      unreadForStaff:
        role === 'visitor'
          ? sql`${chatbotSessions.unreadForStaff} + 1`
          : chatbotSessions.unreadForStaff,
    })
    .where(eq(chatbotSessions.id, sessionId));

  return message;
}

/**
 * Met à jour les coordonnées du visiteur sur la session, sans créer de lead.
 * Utilisé après une réservation de RDV (qui crée déjà son propre lead) pour que
 * la console staff affiche le nom/email/téléphone du visiteur.
 */
export async function updateSessionContact(
  sessionId: string,
  contact: { name?: string | null; email?: string | null; phone?: string | null }
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  await db
    .update(chatbotSessions)
    .set({
      visitorName: contact.name?.trim() || session.visitorName,
      visitorEmail: contact.email?.trim() || session.visitorEmail,
      visitorPhone: contact.phone?.trim() || session.visitorPhone,
      updatedAt: new Date(),
    })
    .where(eq(chatbotSessions.id, sessionId));
}

/** Marque une session comme lue par le staff (compteur non-lu remis à zéro). */
export async function markRead(sessionId: string): Promise<void> {
  await db
    .update(chatbotSessions)
    .set({ unreadForStaff: 0 })
    .where(eq(chatbotSessions.id, sessionId));
}

/** Un agent prend la main : la session passe en mode humain. */
export async function takeOver(
  sessionId: string,
  staffId: string
): Promise<ChatbotSession | null> {
  const [updated] = await db
    .update(chatbotSessions)
    .set({ mode: 'human', assignedStaffId: staffId, updatedAt: new Date() })
    .where(eq(chatbotSessions.id, sessionId))
    .returning();
  return updated ?? null;
}

/** Rend la conversation au bot. */
export async function releaseToBot(
  sessionId: string
): Promise<ChatbotSession | null> {
  const [updated] = await db
    .update(chatbotSessions)
    .set({ mode: 'bot', updatedAt: new Date() })
    .where(eq(chatbotSessions.id, sessionId))
    .returning();
  return updated ?? null;
}

export async function closeSession(
  sessionId: string
): Promise<ChatbotSession | null> {
  const [updated] = await db
    .update(chatbotSessions)
    .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
    .where(eq(chatbotSessions.id, sessionId))
    .returning();
  return updated ?? null;
}

export interface ChatbotSessionSummary extends ChatbotSession {
  lastMessage: string | null;
}

/** Liste les sessions actives pour la console temps réel du back-office. */
export async function listActiveSessions(): Promise<ChatbotSessionSummary[]> {
  const sessions = await db
    .select()
    .from(chatbotSessions)
    .where(eq(chatbotSessions.status, 'active'))
    .orderBy(desc(chatbotSessions.lastMessageAt))
    .limit(ACTIVE_SESSION_LIST_LIMIT);

  return Promise.all(
    sessions.map(async (s) => {
      const [last] = await db
        .select({ content: chatbotMessages.content })
        .from(chatbotMessages)
        .where(eq(chatbotMessages.sessionId, s.id))
        .orderBy(desc(chatbotMessages.createdAt))
        .limit(1);
      return { ...s, lastMessage: last?.content ?? null };
    })
  );
}

/**
 * Détermine l'utilisateur propriétaire du lead créé depuis le chatbot :
 * l'agent assigné en priorité, sinon un administrateur, sinon n'importe quel
 * utilisateur actif (la colonne owner_id est obligatoire).
 */
async function resolveLeadOwnerId(
  assignedStaffId: string | null
): Promise<string | null> {
  if (assignedStaffId) return assignedStaffId;

  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
    .limit(1);
  if (admin) return admin.id;

  const [anyUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isActive, true))
    .limit(1);
  return anyUser?.id ?? null;
}

export interface CaptureRdvInput {
  nom?: string;
  email?: string;
  telephone?: string;
  besoin?: string;
  creneau_souhaite?: string;
}

export interface CaptureRdvResult {
  success: boolean;
  leadId?: string;
  message: string;
}

/** Découpe un nom complet en prénom / nom (le reste forme le nom de famille). */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const [firstName, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: firstName ?? '', lastName: rest.join(' ') };
}

/** Construit la description du lead à partir des infos collectées par le bot. */
export function buildLeadDescription(
  sessionId: string,
  input: Pick<CaptureRdvInput, 'besoin' | 'creneau_souhaite'>
): string {
  return [
    input.besoin ? `Besoin : ${input.besoin}` : null,
    input.creneau_souhaite ? `Créneau souhaité : ${input.creneau_souhaite}` : null,
    `Source : chatbot du site vitrine (session ${sessionId})`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Enregistre une demande de RDV : crée (ou met à jour) un lead CRM et stocke
 * les coordonnées du visiteur sur la session. Idempotent par session.
 */
export async function captureRdv(
  sessionId: string,
  input: CaptureRdvInput
): Promise<CaptureRdvResult> {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, message: 'Session introuvable' };
  }

  const fullName = (input.nom ?? session.visitorName ?? '').trim();
  const email = (input.email ?? session.visitorEmail ?? '')?.trim() || null;
  const phone = (input.telephone ?? session.visitorPhone ?? '')?.trim() || null;

  if (!fullName && !email && !phone) {
    return {
      success: false,
      message: 'Coordonnées insuffisantes pour enregistrer le RDV',
    };
  }

  const { firstName, lastName } = splitFullName(fullName);
  const description = buildLeadDescription(session.id, input);

  // Mise à jour des coordonnées de la session.
  await db
    .update(chatbotSessions)
    .set({
      visitorName: fullName || session.visitorName,
      visitorEmail: email ?? session.visitorEmail,
      visitorPhone: phone ?? session.visitorPhone,
      updatedAt: new Date(),
    })
    .where(eq(chatbotSessions.id, sessionId));

  // Lead déjà créé : on enrichit sa description plutôt que d'en créer un autre.
  if (session.leadId) {
    await db
      .update(leads)
      .set({ description, updatedAt: new Date() })
      .where(eq(leads.id, session.leadId));
    return {
      success: true,
      leadId: session.leadId,
      message: 'Demande de RDV mise à jour',
    };
  }

  const ownerId = await resolveLeadOwnerId(session.assignedStaffId);
  if (!ownerId) {
    return {
      success: false,
      message: 'Aucun utilisateur disponible pour assigner le lead',
    };
  }

  const [lead] = await db
    .insert(leads)
    .values({
      firstName: firstName || 'Prospect',
      lastName: lastName || 'Site web',
      email,
      phone,
      title: 'Demande de RDV via chatbot',
      description,
      status: 'prospect',
      source: 'site_web',
      ownerId,
    })
    .returning();

  if (!lead) throw new Error('Échec de la création du lead');

  await db
    .update(chatbotSessions)
    .set({ leadId: lead.id, updatedAt: new Date() })
    .where(eq(chatbotSessions.id, sessionId));

  return { success: true, leadId: lead.id, message: 'Demande de RDV enregistrée' };
}
