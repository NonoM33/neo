import type { WSContext } from 'hono/ws';
import { isChatbotEnabled } from '../../config/env';
import * as service from './chatbot.service';
import { generateBotReply, correctText } from './chatbot.llm';
import { notifyNewConversation } from './chatbot.notify';
import type { ChatbotMessage, ChatbotSession } from '../../db/schema';

// ─── Registre des connexions (en mémoire, mono-process) ─────────────────────

// Connexions des visiteurs, regroupées par session.
const visitorConns = new Map<string, Set<WSContext>>();
// Connexions des consoles staff du back-office.
const staffConns = new Set<WSContext>();

export function registerVisitor(sessionId: string, ws: WSContext): void {
  let set = visitorConns.get(sessionId);
  if (!set) {
    set = new Set();
    visitorConns.set(sessionId, set);
  }
  set.add(ws);
}

export function unregisterVisitor(sessionId: string, ws: WSContext): void {
  const set = visitorConns.get(sessionId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) visitorConns.delete(sessionId);
}

export function registerStaff(ws: WSContext): void {
  staffConns.add(ws);
}

export function unregisterStaff(ws: WSContext): void {
  staffConns.delete(ws);
}

// ─── Sérialisation ──────────────────────────────────────────────────────────

function serializeMessage(m: ChatbotMessage) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    authorStaffId: m.authorStaffId,
    createdAt: m.createdAt,
  };
}

function serializeSession(
  s: ChatbotSession,
  lastMessage: string | null
) {
  return {
    id: s.id,
    status: s.status,
    mode: s.mode,
    assignedStaffId: s.assignedStaffId,
    visitorName: s.visitorName,
    visitorEmail: s.visitorEmail,
    visitorPhone: s.visitorPhone,
    leadId: s.leadId,
    pageUrl: s.pageUrl,
    unreadForStaff: s.unreadForStaff,
    lastMessage,
    lastMessageAt: s.lastMessageAt,
    createdAt: s.createdAt,
  };
}

// ─── Diffusion ────────────────────────────────────────────────────────────

function send(ws: WSContext, payload: unknown): void {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // Une connexion morte ne doit jamais interrompre la diffusion.
  }
}

function sendToVisitors(sessionId: string, payload: unknown): void {
  const set = visitorConns.get(sessionId);
  if (!set) return;
  for (const ws of set) send(ws, payload);
}

function sendToStaff(payload: unknown): void {
  for (const ws of staffConns) send(ws, payload);
}

/** Notifie les consoles staff qu'une session a changé (liste temps réel). */
async function pushSessionToStaff(
  session: ChatbotSession,
  lastMessage: string | null
): Promise<void> {
  sendToStaff({
    type: 'session_upsert',
    session: serializeSession(session, lastMessage),
  });
}

// ─── Flux visiteur ──────────────────────────────────────────────────────────

/** Initialise/relie une connexion visiteur à sa session et renvoie l'historique. */
export async function handleVisitorInit(
  ws: WSContext,
  input: { visitorId: string; pageUrl?: string; userAgent?: string }
): Promise<string> {
  const session = await service.getOrCreateSession(input);
  registerVisitor(session.id, ws);

  const messages = await service.getMessages(session.id);
  send(ws, {
    type: 'session',
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    messages: messages
      .filter((m) => m.role !== 'system' || true)
      .map(serializeMessage),
  });

  // La console staff découvre la session (nouvelle ou réactivée).
  const lastMessage = messages.at(-1);
  await pushSessionToStaff(session, lastMessage ? lastMessage.content : null);

  return session.id;
}

/** Le visiteur est en train d'écrire : on prévient les consoles staff. */
export function handleVisitorTyping(sessionId: string): void {
  sendToStaff({ type: 'visitor_typing', sessionId });
}

/** Traite un message envoyé par le visiteur. */
export async function handleVisitorMessage(
  sessionId: string,
  content: string
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const session = await service.getSession(sessionId);
  if (!session || session.status !== 'active') return;

  // Première prise de parole du visiteur : on notifie l'équipe commerciale.
  const prior = await service.getMessages(sessionId);
  const isFirstVisitorMessage = !prior.some((m) => m.role === 'visitor');

  const visitorMsg = await service.addMessage(sessionId, 'visitor', trimmed);

  // Diffusion immédiate aux consoles staff.
  sendToStaff({ type: 'message', sessionId, message: serializeMessage(visitorMsg) });
  const refreshed = await service.getSession(sessionId);
  if (refreshed) await pushSessionToStaff(refreshed, trimmed);

  if (isFirstVisitorMessage) {
    // Best-effort : la notification ne doit jamais bloquer la conversation.
    void notifyNewConversation(refreshed ?? session, trimmed).catch((err) =>
      console.error('[chatbot] notification commerciale échouée:', err)
    );
  }

  // En mode humain, le bot ne répond pas : un agent gère la conversation.
  if (session.mode !== 'bot') return;

  await runBotReply(sessionId);
}

/**
 * Indique s'il reste des messages visiteur sans réponse, c.-à-d. si le dernier
 * message conversationnel (hors système) provient du visiteur. Sert à savoir si
 * le bot doit répondre lorsqu'un conseiller lui rend la main.
 */
export function hasUnansweredVisitorMessages(
  messages: Pick<ChatbotMessage, 'role'>[]
): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = messages[i]!.role;
    if (role === 'system') continue;
    return role === 'visitor';
  }
  return false;
}

/**
 * Génère et diffuse une réponse du bot pour la session donnée. Mutualisé entre
 * le flux visiteur normal et la reprise automatique après remise de main.
 */
export async function runBotReply(sessionId: string): Promise<void> {
  if (!isChatbotEnabled) return;

  sendToVisitors(sessionId, { type: 'typing' });

  let reply;
  try {
    const history = await service.getMessages(sessionId);
    reply = await generateBotReply(sessionId, history);
  } catch (err) {
    console.error('[chatbot] LLM error:', err);
    reply = {
      text: "Désolée, je rencontre un souci technique. Laissez-moi vos coordonnées et un conseiller vous recontactera.",
      capturedRdv: false,
    };
  }

  const botText = reply.text || 'Pouvez-vous m\'en dire un peu plus ?';
  const botMsg = await service.addMessage(sessionId, 'bot', botText);

  sendToVisitors(sessionId, { type: 'message', message: serializeMessage(botMsg) });
  sendToStaff({ type: 'message', sessionId, message: serializeMessage(botMsg) });

  // Si un RDV vient d'être capturé, la session (lead, coordonnées) a changé.
  const after = await service.getSession(sessionId);
  if (after) await pushSessionToStaff(after, botText);
}

// ─── Flux staff ───────────────────────────────────────────────────────────

/** Payload initial envoyé à une console staff qui se connecte. */
export async function getInitialStaffPayload() {
  const sessions = await service.listActiveSessions();
  return {
    type: 'init' as const,
    sessions: sessions.map((s) => serializeSession(s, s.lastMessage)),
  };
}

export interface StaffAction {
  type: string;
  sessionId?: string;
  content?: string;
}

/** Traite une action émise par une console staff. */
export async function handleStaffAction(
  ws: WSContext,
  staffId: string,
  action: StaffAction
): Promise<void> {
  const { sessionId } = action;

  switch (action.type) {
    case 'open': {
      // Le staff ouvre une conversation : on renvoie l'historique complet.
      if (!sessionId) return;
      await service.markRead(sessionId);
      const messages = await service.getMessages(sessionId);
      send(ws, {
        type: 'history',
        sessionId,
        messages: messages.map(serializeMessage),
      });
      const session = await service.getSession(sessionId);
      if (session) {
        const lastMessage = messages.at(-1);
        await pushSessionToStaff(session, lastMessage ? lastMessage.content : null);
      }
      return;
    }

    case 'takeover': {
      if (!sessionId) return;
      const session = await service.takeOver(sessionId, staffId);
      if (!session) return;
      const sysMsg = await service.addMessage(
        sessionId,
        'system',
        'Un conseiller a rejoint la conversation.'
      );
      sendToVisitors(sessionId, { type: 'mode', mode: 'human' });
      sendToVisitors(sessionId, { type: 'message', message: serializeMessage(sysMsg) });
      sendToStaff({ type: 'message', sessionId, message: serializeMessage(sysMsg) });
      await pushSessionToStaff(session, sysMsg.content);
      return;
    }

    case 'release': {
      if (!sessionId) return;
      const session = await service.releaseToBot(sessionId);
      if (!session) return;
      const sysMsg = await service.addMessage(
        sessionId,
        'system',
        "La conversation est de nouveau gérée par l'assistant."
      );
      sendToVisitors(sessionId, { type: 'mode', mode: 'bot' });
      sendToVisitors(sessionId, { type: 'message', message: serializeMessage(sysMsg) });
      sendToStaff({ type: 'message', sessionId, message: serializeMessage(sysMsg) });
      await pushSessionToStaff(session, sysMsg.content);

      // Le conseiller rend la main alors que des messages du visiteur sont
      // restés sans réponse : le bot répond pour nous au(x) dernier(s) message(s).
      const history = await service.getMessages(sessionId);
      if (hasUnansweredVisitorMessages(history)) {
        await runBotReply(sessionId);
      }
      return;
    }

    case 'message': {
      if (!sessionId || !action.content?.trim()) return;
      // Envoyer un message prend implicitement la main si ce n'est pas déjà fait.
      let session = await service.getSession(sessionId);
      if (!session || session.status !== 'active') return;
      if (session.mode !== 'human') {
        session = await service.takeOver(sessionId, staffId);
      }
      const staffMsg = await service.addMessage(
        sessionId,
        'staff',
        action.content.trim(),
        staffId
      );
      sendToVisitors(sessionId, { type: 'message', message: serializeMessage(staffMsg) });
      sendToStaff({ type: 'message', sessionId, message: serializeMessage(staffMsg) });
      const after = await service.getSession(sessionId);
      if (after) await pushSessionToStaff(after, staffMsg.content);
      return;
    }

    case 'typing': {
      // Le conseiller écrit : on affiche l'indicateur côté visiteur.
      if (!sessionId) return;
      sendToVisitors(sessionId, { type: 'typing' });
      return;
    }

    case 'correct': {
      // Correction orthographique instantanée du brouillon du conseiller.
      const draft = action.content?.trim();
      if (!draft) return;
      if (!isChatbotEnabled) {
        send(ws, { type: 'correction', original: draft, text: draft });
        return;
      }
      try {
        const corrected = await correctText(draft);
        send(ws, { type: 'correction', original: draft, text: corrected });
      } catch (err) {
        console.error('[chatbot] correction error:', err);
        send(ws, { type: 'correction', original: draft, text: draft });
      }
      return;
    }

    case 'close': {
      if (!sessionId) return;
      const session = await service.closeSession(sessionId);
      if (!session) return;
      sendToVisitors(sessionId, { type: 'closed' });
      sendToStaff({ type: 'session_closed', sessionId });
      return;
    }

    default:
      return;
  }
}
