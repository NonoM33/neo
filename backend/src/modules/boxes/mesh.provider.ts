import { env } from '../../config/env';
import { HeadscaleMeshProvider } from './mesh.headscale';
import { NoMeshProvider, type MeshProvider } from './mesh.port';

/** Le fournisseur de mesh configure par l'environnement (Headscale), ou aucun. */
export function meshProvider(): MeshProvider {
  if (env.HEADSCALE_URL && env.HEADSCALE_API_KEY) {
    return new HeadscaleMeshProvider(env.HEADSCALE_URL, env.HEADSCALE_API_KEY);
  }
  return new NoMeshProvider();
}

export function meshLoginServer(): string | null {
  return env.HEADSCALE_URL && env.HEADSCALE_API_KEY ? env.HEADSCALE_URL : null;
}
