export type ChatRole = 'visitor' | 'bot' | 'staff' | 'system';

export type ChatSessionMode = 'bot' | 'human';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  authorStaffId: string | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  status: string;
  mode: ChatSessionMode;
  assignedStaffId: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
  leadId: string | null;
  pageUrl: string | null;
  unreadForStaff: number;
  lastMessage: string | null;
  lastMessageAt: string;
  createdAt: string;
}

// ── Événements entrants (serveur → console staff) ──────────────────────────
export type StaffInboundEvent =
  | { type: 'init'; sessions: ChatSession[] }
  | { type: 'session_upsert'; session: ChatSession }
  | { type: 'session_closed'; session: string; sessionId?: string }
  | { type: 'history'; sessionId: string; messages: ChatMessage[] }
  | { type: 'message'; sessionId: string; message: ChatMessage }
  | { type: 'visitor_typing'; sessionId: string }
  | { type: 'correction'; original?: string; text: string };

// ── Actions sortantes (console staff → serveur) ────────────────────────────
export type StaffOutboundAction =
  | { type: 'open'; sessionId: string }
  | { type: 'message'; sessionId: string; content: string }
  | { type: 'typing'; sessionId: string }
  | { type: 'takeover'; sessionId: string }
  | { type: 'release'; sessionId: string }
  | { type: 'close'; sessionId: string }
  | { type: 'correct'; sessionId: string; content: string };

export function chatSessionLabel(s: ChatSession): string {
  return (
    s.visitorName ||
    s.visitorEmail ||
    s.visitorPhone ||
    `Visiteur ${s.id.slice(0, 8)}`
  );
}
