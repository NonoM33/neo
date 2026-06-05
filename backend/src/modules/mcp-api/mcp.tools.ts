/**
 * Outils MCP exposés par le serveur `/mcp`.
 *
 * Deux outils suffisent à couvrir *toute* l'API :
 *   - `list_endpoints` : découverte du catalogue (quoi appeler).
 *   - `api_request`    : exécution d'un appel HTTP authentifié contre l'API
 *                        interne, en réutilisant le RBAC du jeton porteur.
 *
 * `api_request` ne ré-implémente aucune logique métier : il forwarde la requête
 * au routeur Hono existant (in-process) avec le même `Authorization`, si bien que
 * les permissions du jeton sont appliquées exactement comme pour un appel HTTP.
 */

import { listResources, searchEndpoints } from './mcp.catalog';
import type { ToolDefinition, ToolResult } from './mcp.protocol';

/** Abstraction du routeur appelable in-process (l'app Hono fournit `.request`). */
export interface ApiFetcher {
  request(input: string, init?: RequestInit): Response | Promise<Response>;
}

export interface ToolContext {
  fetcher: ApiFetcher;
  /** Header Authorization complet (`Bearer neo_sk_...`) du jeton appelant. */
  authorization: string;
}

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list_endpoints',
    description:
      "Liste les endpoints de l'API Neo (ressource, méthode, chemin, description). " +
      'À utiliser pour découvrir quoi appeler avant api_request. ' +
      'Filtres optionnels: search (texte libre) et resource (nom exact, ex: "projets").',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filtre texte libre' },
        resource: { type: 'string', description: 'Nom de ressource exact' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'api_request',
    description:
      "Exécute un appel authentifié contre l'API Neo (/api/*) et renvoie le statut " +
      'et le corps de la réponse. Les permissions du jeton sont appliquées. ' +
      'Exemple: { method: "GET", path: "/api/projets", query: { page: "1" } }.',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
        path: {
          type: 'string',
          description: 'Chemin commençant par /api, ex: /api/projets/:id',
        },
        query: {
          type: 'object',
          description: 'Paramètres de requête (valeurs en chaîne)',
          additionalProperties: { type: 'string' },
        },
        body: {
          type: 'object',
          description: 'Corps JSON pour POST/PUT/PATCH',
        },
      },
      required: ['method', 'path'],
      additionalProperties: false,
    },
  },
];

export function getToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

function textResult(text: string, isError = false): ToolResult {
  return { content: [{ type: 'text', text }], isError };
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  let url = path.startsWith('/') ? path : `/${path}`;
  if (query && typeof query === 'object') {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
}

async function runListEndpoints(args: Record<string, unknown>): Promise<ToolResult> {
  const search = typeof args.search === 'string' ? args.search : undefined;
  const resource = typeof args.resource === 'string' ? args.resource : undefined;
  const endpoints = searchEndpoints({ search, resource });
  const payload = {
    resources: listResources(),
    count: endpoints.length,
    endpoints,
  };
  return textResult(JSON.stringify(payload, null, 2));
}

async function runApiRequest(
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  const method = typeof args.method === 'string' ? args.method.toUpperCase() : '';
  const path = typeof args.path === 'string' ? args.path : '';

  if (!ALLOWED_METHODS.has(method)) {
    return textResult(`Méthode invalide: ${method || '(vide)'}`, true);
  }
  if (!path.startsWith('/api')) {
    return textResult('Le chemin doit commencer par /api', true);
  }

  const url = buildUrl(path, args.query as Record<string, unknown> | undefined);
  const headers: Record<string, string> = { Authorization: ctx.authorization };
  const init: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'DELETE' && args.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(args.body);
  }

  const response = await ctx.fetcher.request(url, init);
  const raw = await response.text();
  let body: unknown = raw;
  try {
    body = raw.length > 0 ? JSON.parse(raw) : null;
  } catch {
    // réponse non-JSON (PDF, texte) : on garde le brut
  }

  const summary = { status: response.status, ok: response.ok, body };
  return textResult(JSON.stringify(summary, null, 2), !response.ok);
}

/** Point d'entrée d'exécution d'un outil par son nom. */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolResult> {
  switch (name) {
    case 'list_endpoints':
      return runListEndpoints(args);
    case 'api_request':
      return runApiRequest(args, ctx);
    default:
      return textResult(`Outil inconnu: ${name}`, true);
  }
}
