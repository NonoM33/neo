import { Hono } from 'hono';
import type { Context } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { WSContext } from 'hono/ws';
import { verify } from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';
import { db } from '../../config/database';
import { users } from '../../db/schema';
import { getSessionUser } from '../../backoffice/middleware/admin-auth';
import { hasPermission } from '../../modules/roles/permissions';
import type { JWTPayload } from '../../middleware/auth.middleware';
import * as hub from './chatbot.ws';

const { upgradeWebSocket, websocket } = createBunWebSocket();

const chatbotRoutes = new Hono();

/**
 * Vérifie un jeton JWT staff et renvoie l'id du conseiller s'il est autorisé à
 * piloter la console de chat live (permission `support.manage`, ou rôle admin).
 * Logique pure (sans accès base) afin d'être testable en isolation. Renvoie
 * null si le jeton est invalide/expiré ou si la permission manque.
 */
export function staffIdFromChatToken(token: string): string | null {
  let payload: JWTPayload;
  try {
    payload = verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
  if (!payload || typeof payload.userId !== 'string') return null;

  const permissions = payload.permissions ?? [];
  const roles = payload.roles ?? [payload.role];
  const isAdmin = payload.role === 'admin' || roles.includes('admin');
  if (!hasPermission(permissions, 'support.manage', isAdmin)) {
    return null;
  }
  return payload.userId;
}

/**
 * Résout l'utilisateur staff autorisé à piloter la console de chat live.
 * Deux sources d'authentification acceptées :
 *   1. Cookie de session back-office legacy (getSessionUser).
 *   2. Jeton JWT staff (app React) passé en query `?token=...` — le handshake
 *      WebSocket du navigateur ne permet pas d'envoyer d'en-tête Authorization.
 * Retourne l'id du conseiller si autorisé, sinon null.
 */
async function resolveStaffWsUserId(c: Context): Promise<string | null> {
  const sessionUser = await getSessionUser(c);
  if (
    sessionUser &&
    hasPermission(sessionUser.permissions, 'support.manage', sessionUser.isSuperAdmin)
  ) {
    return sessionUser.id;
  }

  const token = c.req.query('token');
  if (!token) return null;

  const userId = staffIdFromChatToken(token);
  if (!userId) return null;

  const [user] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !user.isActive) return null;

  return user.id;
}

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
    const staffId = await resolveStaffWsUserId(c);

    if (!staffId) {
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
        await hub.handleStaffAction(ws, staffId, {
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
