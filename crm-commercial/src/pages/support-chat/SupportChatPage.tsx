import { useEffect, useRef, useState } from 'react';
import { Btn, Icon, Pill } from '../../components/neo';
import { chatSessionLabel } from '../../types';
import type { ChatMessage, ChatRole, ChatSession } from '../../types';
import { useSupportChat } from './useSupportChat';
import './support-chat.css';

function formatTime(value: string): string {
  try {
    return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const ROLE_META: Record<ChatRole, { icon: 'headset' | 'sparkles' | 'user' | 'message'; label: string }> = {
  staff: { icon: 'headset', label: 'Conseiller' },
  bot: { icon: 'sparkles', label: 'Assistant' },
  visitor: { icon: 'user', label: 'Visiteur' },
  system: { icon: 'message', label: '' },
};

function ConnPill({ state }: { state: ReturnType<typeof useSupportChat>['connState'] }) {
  if (state === 'online') return <Pill tone="success" dot>En ligne</Pill>;
  if (state === 'connecting') return <Pill tone="warning" dot>Connexion…</Pill>;
  return <Pill tone="danger" dot>Déconnecté</Pill>;
}

function SessionRow({
  session,
  active,
  onClick,
}: {
  session: ChatSession;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={'chat-item' + (active ? ' active' : '')} onClick={onClick}>
      <div className="ci-top">
        <span className="ci-name">{chatSessionLabel(session)}</span>
        <span className="ci-time">{formatTime(session.lastMessageAt)}</span>
      </div>
      <div className="ci-prev">{session.lastMessage || '…'}</div>
      <div className="ci-foot">
        <Pill tone={session.mode === 'human' ? 'success' : 'neutral'}>
          {session.mode === 'human' ? 'Agent' : 'Bot'}
        </Pill>
        {session.unreadForStaff > 0 && <Pill tone="danger">{session.unreadForStaff}</Pill>}
      </div>
    </button>
  );
}

function MessageBubble({ message, showMeta }: { message: ChatMessage; showMeta: boolean }) {
  const meta = ROLE_META[message.role];
  return (
    <div className={'cm-row ' + message.role}>
      {showMeta && message.role !== 'system' && (
        <div className={'cm-meta ' + message.role}>
          <Icon name={meta.icon} size={12} /> {meta.label}
        </div>
      )}
      <div className={'cm ' + message.role}>{message.content}</div>
    </div>
  );
}

export function SupportChatPage() {
  const [draft, setDraft] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Applique une correction orthographique renvoyée par le LLM dans le brouillon.
  const chat = useSupportChat((text) => {
    setDraft(text);
    setCorrecting(false);
  });

  // Auto-scroll en bas du fil à chaque nouveau message / changement de session.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.visitorTyping, chat.currentId]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    chat.sendMessage(text);
    setDraft('');
  };

  const handleCorrect = () => {
    const text = draft.trim();
    if (!text) return;
    setCorrecting(true);
    chat.requestCorrection(text);
  };

  const handleClose = () => {
    if (window.confirm('Clôturer cette conversation ?')) chat.closeSession();
  };

  const current = chat.current;
  const contact = current
    ? [current.visitorEmail, current.visitorPhone].filter(Boolean).join(' · ')
    : '';

  return (
    <div className="support-chat-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Chat en direct</h1>
          <p>Conversations visiteurs en temps réel — reprenez la main quand le bot bloque</p>
        </div>
        <div className="page-actions">
          <ConnPill state={chat.connState} />
        </div>
      </div>

      <div className="chat-console card">
        <div className="chat-list">
          <div className="chat-list-head">
            <span>
              <Icon name="message" size={15} /> Conversations
            </span>
          </div>
          <div className="chat-list-body">
            {chat.sessions.length === 0 ? (
              <div className="chat-empty">Aucune conversation active.</div>
            ) : (
              chat.sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  active={s.id === chat.currentId}
                  onClick={() => chat.openSession(s.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="chat-main">
          {!current ? (
            <div className="chat-placeholder">
              Sélectionnez une conversation pour la suivre en temps réel.
            </div>
          ) : (
            <>
              <div className="chat-main-head">
                <div style={{ flex: 1 }}>
                  <div className="cmh-name">
                    {chatSessionLabel(current)}
                    {current.leadId && (
                      <Pill tone="success">
                        <Icon name="checkCircle" size={12} /> Lead créé
                      </Pill>
                    )}
                  </div>
                  <div className="cmh-contact">{contact || 'Coordonnées non renseignées'}</div>
                </div>
                {current.mode === 'human' ? (
                  <Btn variant="ghost" size="sm" icon="sparkles" onClick={chat.release}>
                    Rendre au bot
                  </Btn>
                ) : (
                  <Btn variant="ochre" size="sm" icon="headset" onClick={chat.takeOver}>
                    Prendre la main
                  </Btn>
                )}
                <Btn variant="danger-ghost" size="sm" icon="x" onClick={handleClose}>
                  Clôturer
                </Btn>
              </div>

              {current.mode === 'human' && (
                <div className="chat-takeover">
                  <Icon name="headset" size={14} /> Un conseiller a pris la main — le bot est en
                  pause.
                </div>
              )}

              <div className="chat-thread" ref={threadRef}>
                {chat.messages.map((m, i) => (
                  <MessageBubble
                    key={m.id || i}
                    message={m}
                    showMeta={i === 0 || chat.messages[i - 1].role !== m.role}
                  />
                ))}
                {chat.visitorTyping && (
                  <div className="chat-typing">
                    <span className="chat-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                )}
              </div>

              <div className="chat-form">
                <textarea
                  className="neo-field"
                  rows={2}
                  placeholder="Répondre au visiteur…"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    chat.sendTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Btn
                  variant="ghost"
                  icon="sparkles"
                  onClick={handleCorrect}
                  disabled={correcting || !draft.trim()}
                  title="Corriger l'orthographe"
                />
                <Btn icon="send" onClick={handleSend} disabled={!draft.trim()}>
                  Envoyer
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SupportChatPage;
