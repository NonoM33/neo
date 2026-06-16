import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChatMessage,
  ChatSession,
  StaffInboundEvent,
  StaffOutboundAction,
} from '../../types';

export type ChatConnState = 'connecting' | 'online' | 'offline';

function buildWsUrl(token: string): string {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const url = new URL(apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/chatbot/staff';
  url.search = `?token=${encodeURIComponent(token)}`;
  return url.toString();
}

interface UseSupportChat {
  connState: ChatConnState;
  sessions: ChatSession[];
  currentId: string | null;
  current: ChatSession | null;
  messages: ChatMessage[];
  visitorTyping: boolean;
  openSession: (id: string) => void;
  sendMessage: (content: string) => void;
  sendTyping: () => void;
  takeOver: () => void;
  release: () => void;
  closeSession: () => void;
  requestCorrection: (draft: string) => void;
}

export function useSupportChat(onCorrection?: (text: string) => void): UseSupportChat {
  const [connState, setConnState] = useState<ChatConnState>(() =>
    localStorage.getItem('accessToken') ? 'connecting' : 'offline'
  );
  const [sessionMap, setSessionMap] = useState<Record<string, ChatSession>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [visitorTyping, setVisitorTyping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const closedRef = useRef(false);
  const onCorrectionRef = useRef(onCorrection);

  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);

  useEffect(() => {
    onCorrectionRef.current = onCorrection;
  }, [onCorrection]);

  const send = useCallback((action: StaffOutboundAction) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(action));
    }
  }, []);

  const handleEvent = useCallback((evt: StaffInboundEvent) => {
    switch (evt.type) {
      case 'init': {
        const map: Record<string, ChatSession> = {};
        for (const s of evt.sessions) map[s.id] = s;
        setSessionMap(map);
        break;
      }
      case 'session_upsert':
        setSessionMap((prev) => ({ ...prev, [evt.session.id]: evt.session }));
        break;
      case 'session_closed': {
        const closedId = evt.sessionId ?? evt.session;
        setSessionMap((prev) => {
          const next = { ...prev };
          delete next[closedId];
          delete next[evt.session];
          return next;
        });
        if (currentIdRef.current === closedId || currentIdRef.current === evt.session) {
          setCurrentId(null);
          setMessages([]);
        }
        break;
      }
      case 'history':
        if (evt.sessionId === currentIdRef.current) {
          setMessages(evt.messages);
          setVisitorTyping(false);
        }
        break;
      case 'message': {
        setSessionMap((prev) => {
          const s = prev[evt.sessionId];
          if (!s) return prev;
          const unread =
            evt.sessionId !== currentIdRef.current && evt.message.role === 'visitor'
              ? (s.unreadForStaff || 0) + 1
              : s.unreadForStaff;
          return {
            ...prev,
            [evt.sessionId]: {
              ...s,
              lastMessage: evt.message.content,
              lastMessageAt: evt.message.createdAt,
              unreadForStaff: unread,
            },
          };
        });
        if (evt.sessionId === currentIdRef.current) {
          setVisitorTyping(false);
          setMessages((prev) => {
            if (evt.message.id && prev.some((m) => m.id === evt.message.id)) return prev;
            return [...prev, evt.message];
          });
        }
        break;
      }
      case 'visitor_typing':
        if (evt.sessionId === currentIdRef.current) {
          setVisitorTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setVisitorTyping(false), 4000);
        }
        break;
      case 'correction':
        onCorrectionRef.current?.(evt.text);
        break;
    }
  }, []);

  useEffect(() => {
    closedRef.current = false;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return;
    }

    const connect = () => {
      const ws = new WebSocket(buildWsUrl(token));
      wsRef.current = ws;
      ws.onopen = () => setConnState('online');
      ws.onclose = () => {
        setConnState('offline');
        if (!closedRef.current) {
          reconnectRef.current = setTimeout(() => {
            setConnState('connecting');
            connect();
          }, 3000);
        }
      };
      ws.onmessage = (event) => {
        let data: StaffInboundEvent;
        try {
          data = JSON.parse(event.data as string) as StaffInboundEvent;
        } catch {
          return;
        }
        handleEvent(data);
      };
    };

    connect();

    return () => {
      closedRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [handleEvent]);

  const openSession = useCallback(
    (id: string) => {
      setCurrentId(id);
      setMessages([]);
      setVisitorTyping(false);
      setSessionMap((prev) => {
        const s = prev[id];
        if (!s) return prev;
        return { ...prev, [id]: { ...s, unreadForStaff: 0 } };
      });
      send({ type: 'open', sessionId: id });
    },
    [send]
  );

  const sendMessage = useCallback(
    (content: string) => {
      const id = currentIdRef.current;
      const text = content.trim();
      if (!id || !text) return;
      send({ type: 'message', sessionId: id, content: text });
    },
    [send]
  );

  const sendTyping = useCallback(() => {
    const id = currentIdRef.current;
    if (!id) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    send({ type: 'typing', sessionId: id });
  }, [send]);

  const takeOver = useCallback(() => {
    const id = currentIdRef.current;
    if (id) send({ type: 'takeover', sessionId: id });
  }, [send]);

  const release = useCallback(() => {
    const id = currentIdRef.current;
    if (id) send({ type: 'release', sessionId: id });
  }, [send]);

  const closeSession = useCallback(() => {
    const id = currentIdRef.current;
    if (id) send({ type: 'close', sessionId: id });
  }, [send]);

  const requestCorrection = useCallback(
    (draft: string) => {
      const id = currentIdRef.current;
      const text = draft.trim();
      if (id && text) send({ type: 'correct', sessionId: id, content: text });
    },
    [send]
  );

  const sessions = Object.values(sessionMap).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
  const current = currentId ? (sessionMap[currentId] ?? null) : null;

  return {
    connState,
    sessions,
    currentId,
    current,
    messages,
    visitorTyping,
    openSession,
    sendMessage,
    sendTyping,
    takeOver,
    release,
    closeSession,
    requestCorrection,
  };
}
