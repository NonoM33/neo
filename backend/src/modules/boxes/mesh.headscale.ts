import type { MeshEnrollment, MeshNode, MeshProvider } from './mesh.port';

// Headscale : API REST (/api/v1, Bearer) du serveur de controle Tailscale
// auto-heberge (neo-cloud/headscale). Un utilisateur headscale PAR BOX, portant
// le nom du noeud : c'est la cle d'isolation (la politique n'autorise que ops@
// vers tag:box) et le filtre de recherche du noeud.

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const PREAUTH_KEY_TTL_DAYS = 7;
const BOX_TAG = 'tag:box';

export class HeadscaleError extends Error {
  constructor(operation: string, status: number, body: string) {
    super(`headscale ${operation} -> ${status}: ${body.slice(0, 200)}`);
    this.name = 'HeadscaleError';
  }
}

export class HeadscaleMeshProvider implements MeshProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchFn: FetchLike = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async enrollBox(hostname: string): Promise<MeshEnrollment> {
    const userId = await this.ensureUser(hostname);
    const expiration = new Date(this.now().getTime() + PREAUTH_KEY_TTL_DAYS * 86_400_000);
    const created = await this.call<{ preAuthKey: { key: string } }>('POST', '/api/v1/preauthkey', {
      user: userId,
      reusable: false,
      ephemeral: false,
      expiration: expiration.toISOString(),
      aclTags: [BOX_TAG],
    });
    return { loginServer: this.baseUrl, authKey: created.preAuthKey.key, hostname };
  }

  async findBoxNode(hostname: string): Promise<MeshNode | null> {
    const { nodes } = await this.call<{ nodes: HeadscaleNode[] }>(
      'GET',
      `/api/v1/node?user=${encodeURIComponent(hostname)}`,
    );
    // Une box reenrolee (SD refaite) laisse un noeud perime derriere elle :
    // on prefere celui qui est en ligne, sinon le plus recemment vu.
    const node = [...nodes]
      .filter((n) => n.ipAddresses.length > 0)
      .sort((a, b) => Number(b.online) - Number(a.online) || seen(b) - seen(a))[0];
    if (!node) return null;
    const ip = node.ipAddresses.find((a) => a.includes('.')) ?? node.ipAddresses[0]!;
    return { ip, online: node.online, lastSeen: node.lastSeen ? new Date(node.lastSeen) : null };
  }

  private async ensureUser(name: string): Promise<string> {
    const { users } = await this.call<{ users: HeadscaleUser[] }>(
      'GET',
      `/api/v1/user?name=${encodeURIComponent(name)}`,
    );
    const existing = users.find((u) => u.name === name);
    if (existing) return existing.id;
    const { user } = await this.call<{ user: HeadscaleUser }>('POST', '/api/v1/user', { name });
    return user.id;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) throw new HeadscaleError(`${method} ${path}`, response.status, text);
    return (text ? JSON.parse(text) : {}) as T;
  }
}

function seen(node: HeadscaleNode): number {
  return node.lastSeen ? new Date(node.lastSeen).getTime() : 0;
}

interface HeadscaleUser {
  id: string;
  name: string;
}

interface HeadscaleNode {
  ipAddresses: string[];
  givenName: string;
  online: boolean;
  lastSeen?: string | null;
}
