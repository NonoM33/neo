import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_PROTOCOL_VERSION,
  SERVER_INFO,
  dispatch,
  isNotification,
  type ProtocolDeps,
  type ToolResult,
} from './mcp.protocol';

const okResult: ToolResult = { content: [{ type: 'text', text: 'ok' }] };

function deps(overrides: Partial<ProtocolDeps> = {}): ProtocolDeps {
  return {
    listTools: () => [{ name: 'demo', description: 'd', inputSchema: { type: 'object' } }],
    callTool: async () => okResult,
    ...overrides,
  };
}

describe('isNotification', () => {
  it('vrai sans id', () => {
    expect(isNotification({ jsonrpc: '2.0', method: 'x' })).toBe(true);
  });
  it('faux avec id', () => {
    expect(isNotification({ jsonrpc: '2.0', id: 1, method: 'x' })).toBe(false);
  });
});

describe('dispatch — initialize', () => {
  it('renvoie serverInfo et echo de la version du client', async () => {
    const res = await dispatch(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
      deps()
    );
    expect(res).not.toBeNull();
    const result = (res as any).result;
    expect(result.protocolVersion).toBe('2024-11-05');
    expect(result.serverInfo).toEqual(SERVER_INFO);
    expect(result.capabilities.tools).toBeDefined();
  });

  it('retombe sur la version par défaut sans protocolVersion', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: 1, method: 'initialize' }, deps());
    expect((res as any).result.protocolVersion).toBe(DEFAULT_PROTOCOL_VERSION);
  });
});

describe('dispatch — notifications', () => {
  it('notifications/initialized ne produit aucune réponse', async () => {
    const res = await dispatch({ jsonrpc: '2.0', method: 'notifications/initialized' }, deps());
    expect(res).toBeNull();
  });
});

describe('dispatch — ping', () => {
  it('répond un objet vide', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: 2, method: 'ping' }, deps());
    expect((res as any).result).toEqual({});
  });
});

describe('dispatch — tools/list', () => {
  it('renvoie les définitions injectées', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, deps());
    expect((res as any).result.tools).toHaveLength(1);
    expect((res as any).result.tools[0].name).toBe('demo');
  });
});

describe('dispatch — tools/call', () => {
  it('exécute l\'outil et renvoie son résultat', async () => {
    let called = '';
    const res = await dispatch(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'demo', arguments: { a: 1 } } },
      deps({
        callTool: async (name) => {
          called = name;
          return okResult;
        },
      })
    );
    expect(called).toBe('demo');
    expect((res as any).result).toEqual(okResult);
  });

  it('erreur INVALID_PARAMS sans name', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: {} }, deps());
    expect((res as any).error.code).toBe(-32602);
  });

  it('convertit une exception d\'outil en erreur JSON-RPC', async () => {
    const res = await dispatch(
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'demo' } },
      deps({
        callTool: async () => {
          throw new Error('boom');
        },
      })
    );
    expect((res as any).error.code).toBe(-32603);
    expect((res as any).error.message).toContain('boom');
  });
});

describe('dispatch — méthode inconnue', () => {
  it('renvoie METHOD_NOT_FOUND pour une requête', async () => {
    const res = await dispatch({ jsonrpc: '2.0', id: 7, method: 'nope' }, deps());
    expect((res as any).error.code).toBe(-32601);
  });

  it('ignore une notification inconnue', async () => {
    const res = await dispatch({ jsonrpc: '2.0', method: 'nope/whatever' }, deps());
    expect(res).toBeNull();
  });
});
