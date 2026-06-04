// Garde d'ouverture de l'overlay « pièce ».
//
// Bug ciblé : le clic qui ferme l'overlay retombe sur le canvas 3D situé
// dessous (click-through). Le raycaster repique alors une pièce et rouvre
// aussitôt l'overlay → l'utilisateur a l'impression de ne pas pouvoir quitter.
//
// La garde (logique pure, sans DOM ni Three.js) interdit toute réouverture
// tant qu'une pièce est ouverte, puis pendant un court délai après la
// fermeture (le temps que l'évènement parasite de fin de clic se dissipe).
export class OverlayGate {
  private openKey: string | null = null;
  private blockedUntil = 0;

  /** Une pièce est-elle actuellement ouverte ? */
  isOpen(): boolean {
    return this.openKey !== null;
  }

  /** Clé de la pièce ouverte, ou null. */
  current(): string | null {
    return this.openKey;
  }

  /** Une ouverture est-elle permise maintenant ? (rien d'ouvert + hors cooldown) */
  canOpen(now: number): boolean {
    return this.openKey === null && now >= this.blockedUntil;
  }

  /**
   * Tente d'ouvrir `key`. Renvoie false si refusé (déjà ouvert ou cooldown),
   * auquel cas l'appelant ne doit rien afficher.
   */
  open(key: string, now: number): boolean {
    if (!this.canOpen(now)) return false;
    this.openKey = key;
    return true;
  }

  /** Ferme l'overlay et arme le cooldown anti-réouverture. */
  close(now: number, cooldownMs = 450): void {
    this.openKey = null;
    this.blockedUntil = now + cooldownMs;
  }
}
