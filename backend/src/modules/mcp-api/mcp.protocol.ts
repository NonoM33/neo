/**
 * Couche protocole MCP (Model Context Protocol) sur JSON-RPC 2.0.
 *
 * Implémentation minimale et *pure* (sans Hono ni I/O) du sous-ensemble
 * nécessaire à un serveur d'outils en transport "Streamable HTTP" :
 *   - initialize
 *   - notifications/initialized (notification, sans réponse)
 *   - ping
 *   - tools/list
 *   - tools/call
 *
 * Le dispatcher reçoit ses dépendances (liste/exécution d'outils) par injection,
 * ce qui le rend testable en isolation.
 */

export const SERVER_INFO = { name: 'neo-api', version: '1.0.0' } as const;
export const DEFAULT_PROTOCOL_VERSION = '2025-06-18';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcError {
  jsonrpc: '2.0';
  id: string | number | null;
  error: { code: number; message: string; data?: unknown };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

export interface ToolContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ProtocolDeps {
  listTools: () => ToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}

// Codes d'erreur JSON-RPC standard.
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

function success(id: JsonRpcSuccess['id'], result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}

function failure(
  id: JsonRpcError['id'],
  code: number,
  message: string,
  data?: unknown
): JsonRpcError {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } };
}

/** Vrai si le message est une notification (pas d'`id`) : aucune réponse attendue. */
export function isNotification(message: JsonRpcRequest): boolean {
  return message.id === undefined || message.id === null;
}

/**
 * Traite un message JSON-RPC unique. Renvoie la réponse à sérialiser, ou `null`
 * pour les notifications (qui ne produisent aucune réponse).
 */
export async function dispatch(
  message: JsonRpcRequest,
  deps: ProtocolDeps
): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null;

  switch (message.method) {
    case 'initialize': {
      const params = (message.params ?? {}) as { protocolVersion?: unknown };
      const protocolVersion =
        typeof params.protocolVersion === 'string'
          ? params.protocolVersion
          : DEFAULT_PROTOCOL_VERSION;
      return success(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    }

    case 'notifications/initialized':
    case 'initialized':
      return null; // notification → pas de réponse

    case 'ping':
      return success(id, {});

    case 'tools/list':
      return success(id, { tools: deps.listTools() });

    case 'tools/call': {
      const params = (message.params ?? {}) as { name?: unknown; arguments?: unknown };
      if (typeof params.name !== 'string') {
        return failure(id, INVALID_PARAMS, 'Paramètre "name" requis');
      }
      const args =
        params.arguments && typeof params.arguments === 'object'
          ? (params.arguments as Record<string, unknown>)
          : {};
      try {
        const result = await deps.callTool(params.name, args);
        return success(id, result);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Erreur inconnue';
        return failure(id, INTERNAL_ERROR, `Échec de l'outil: ${detail}`);
      }
    }

    default:
      if (isNotification(message)) return null;
      return failure(id, METHOD_NOT_FOUND, `Méthode inconnue: ${message.method}`);
  }
}
