import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { WSContext } from 'hono/ws';
import { getSessionUser } from '../../backoffice/middleware/admin-auth';
import { hasPermission } from '../../modules/roles/permissions';
import * as hub from './chatbot.ws';

const { upgradeWebSocket, websocket } = createBunWebSocket();

const chatbotRoutes = new Hono();

function parse(data: unknown): Record<string, any> | null {
  if (typeof data !== 'string') return null;
  try {
    const obj = JSON.parse(data);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

// ─── WebSocket visiteur (site vitrine, sans authentification) ────────────────
chatbotRoutes.get(
  '/ws/chatbot',
  upgradeWebSocket(() => {
    let sessionId: string | null = null;
    let conn: WSContext | null = null;

    return {
      onMessage: async (event, ws) => {
        conn = ws;
        const data = parse(event.data);
        if (!data) return;

        if (data.type === 'init') {
          if (typeof data.visitorId !== 'string' || !data.visitorId) return;
          sessionId = await hub.handleVisitorInit(ws, {
            visitorId: data.visitorId,
            pageUrl: typeof data.pageUrl === 'string' ? data.pageUrl : undefined,
            userAgent:
              typeof data.userAgent === 'string' ? data.userAgent : undefined,
          });
        } else if (data.type === 'message') {
          if (!sessionId || typeof data.content !== 'string') return;
          await hub.handleVisitorMessage(sessionId, data.content);
        } else if (data.type === 'typing') {
          if (!sessionId) return;
          hub.handleVisitorTyping(sessionId);
        }
      },
      onClose: () => {
        if (sessionId && conn) hub.unregisterVisitor(sessionId, conn);
      },
    };
  })
);

// ─── WebSocket staff (back-office, session cookie + permission support) ──────
chatbotRoutes.get(
  '/ws/chatbot/staff',
  upgradeWebSocket(async (c) => {
    const user = await getSessionUser(c);
    const authorized =
      !!user && hasPermission(user.permissions, 'support.manage', user.isSuperAdmin);

    if (!authorized || !user) {
      return {
        onOpen: (_evt, ws) => ws.close(1008, 'Unauthorized'),
      };
    }

    let conn: WSContext | null = null;
    return {
      onOpen: async (_evt, ws) => {
        conn = ws;
        hub.registerStaff(ws);
        const payload = await hub.getInitialStaffPayload();
        ws.send(JSON.stringify(payload));
      },
      onMessage: async (event, ws) => {
        const data = parse(event.data);
        if (!data || typeof data.type !== 'string') return;
        await hub.handleStaffAction(ws, user.id, {
          type: data.type,
          sessionId: typeof data.sessionId === 'string' ? data.sessionId : undefined,
          content: typeof data.content === 'string' ? data.content : undefined,
        });
      },
      onClose: () => {
        if (conn) hub.unregisterStaff(conn);
      },
    };
  })
);

// ─── Widget JS (chargé par <script src="/chatbot-widget.js">) ────────────────
const widgetPath = import.meta.dir + '/chatbot-widget.js';
chatbotRoutes.get('/chatbot-widget.js', async (c) => {
  const js = await Bun.file(widgetPath).text();
  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
  });
});

export { chatbotRoutes, websocket as chatbotWebSocket };
