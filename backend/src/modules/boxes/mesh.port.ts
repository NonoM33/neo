// Le mesh (acces distant aux box) vu du module boxes : ce qu'on lui demande,
// sans savoir comment c'est fait. Implementation reelle : Headscale (mesh.headscale.ts).

export interface MeshEnrollment {
  /** URL du serveur de controle, ecrite dans la box. */
  loginServer: string;
  /** Cle pre-auth a usage unique : la box la consomme a son premier `tailscale up`. */
  authKey: string;
  /** Nom du noeud sur le mesh (aussi l'utilisateur headscale qui le porte). */
  hostname: string;
}

export interface MeshNode {
  ip: string;
  online: boolean;
  lastSeen: Date | null;
}

export interface MeshProvider {
  /** Prepare l'arrivee d'une box sur le mesh (utilisateur + cle pre-auth). */
  enrollBox(hostname: string): Promise<MeshEnrollment>;
  /** Le noeud d'une box, ou null si elle n'a jamais rejoint le mesh. */
  findBoxNode(hostname: string): Promise<MeshNode | null>;
}

/** Nom mesh d'une box : stable, lisible, derive de son identifiant. */
export function meshHostname(boxId: string): string {
  return `neo-box-${boxId.replace(/-/g, '').slice(0, 12)}`;
}

/** Sans serveur de controle configure, le mesh n'existe pas : la box vit sans. */
export class NoMeshProvider implements MeshProvider {
  async enrollBox(): Promise<MeshEnrollment> {
    throw new Error('mesh non configure');
  }

  async findBoxNode(): Promise<MeshNode | null> {
    return null;
  }
}
