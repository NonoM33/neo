/**
 * Serveur MCP (Model Context Protocol) en transport "Streamable HTTP".
 *
 * Monté sur `/mcp`, protégé par `authMiddleware` : le client doit présenter un
 * jeton système (`Authorization: Bearer neo_sk_...`). Les appels d'outils sont
 * forwardés in-process à l'app Hono principale avec ce même header, donc le RBAC
 * du jeton s'applique tel quel.
 *
 * Implémentation JSON-RPC volontairement minimale (réponse JSON unique, pas de
 * flux SSE serveur→client ni de sessions) : suffisante pour un serveur d'outils.
 */

import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware';
import { dispatch, type JsonRpcRequest, type JsonRpcResponse } from './mcp.protocol';
import { executeTool, getToolDefinitions, type ApiFetcher } from './mcp.tools';

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;

export function createMcpRoutes(fetcher: ApiFetcher) {
  const router = new Hono();

  // GET /mcp : pas de canal SSE serveur→client (transport en requête/réponse pure).
  router.get('/', (c) => c.json({ error: { code: INVALID_REQUEST, message: 'Use POST' } }, 405));

  router.post('/', authMiddleware, async (c) => {
    const authorization = c.req.header('Authorization') ?? '';

    let parsed: unknown;
    try {
      parsed = await c.req.json();
    } catch {
      return c.json(
        { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'JSON invalide' } },
        400
      );
    }

    const deps = {
      listTools: getToolDefinitions,
      callTool: (name: string, args: Record<string, unknown>) =>
        executeTool(name, args, { fetcher, authorization }),
    };

    const messages: JsonRpcRequest[] = Array.isArray(parsed)
      ? (parsed as JsonRpcRequest[])
      : [parsed as JsonRpcRequest];

    const responses: JsonRpcResponse[] = [];
    for (const message of messages) {
      const response = await dispatch(message, deps);
      if (response) responses.push(response);
    }

    // Que des notifications → rien à renvoyer (202 Accepted).
    if (responses.length === 0) {
      return c.body(null, 202);
    }

    const payload = Array.isArray(parsed) ? responses : responses[0];
    return c.json(payload as JsonRpcResponse | JsonRpcResponse[]);
  });

  return router;
}
