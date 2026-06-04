import { describe, expect, it } from 'bun:test';
import { OverlayGate } from './overlay-gate';

describe('OverlayGate', () => {
  it('autorise une première ouverture', () => {
    const g = new OverlayGate();
    expect(g.canOpen(0)).toBe(true);
    expect(g.open('salon', 0)).toBe(true);
    expect(g.isOpen()).toBe(true);
    expect(g.current()).toBe('salon');
  });

  it('refuse une seconde ouverture tant qu’une pièce est ouverte', () => {
    const g = new OverlayGate();
    g.open('salon', 0);
    expect(g.canOpen(10)).toBe(false);
    expect(g.open('cuisine', 10)).toBe(false);
    expect(g.current()).toBe('salon');
  });

  it('bloque la réouverture juste après la fermeture (click-through)', () => {
    const g = new OverlayGate();
    g.open('salon', 1000);
    g.close(1000); // cooldown 450ms par défaut
    expect(g.isOpen()).toBe(false);
    // le clic parasite qui retombe sur le canvas ~100ms après la fermeture
    expect(g.canOpen(1100)).toBe(false);
    expect(g.open('cuisine', 1100)).toBe(false);
  });

  it('réautorise l’ouverture une fois le cooldown écoulé', () => {
    const g = new OverlayGate();
    g.open('salon', 1000);
    g.close(1000);
    expect(g.canOpen(1500)).toBe(true);
    expect(g.open('cuisine', 1500)).toBe(true);
    expect(g.current()).toBe('cuisine');
  });

  it('respecte un cooldown personnalisé', () => {
    const g = new OverlayGate();
    g.open('salon', 0);
    g.close(0, 1000);
    expect(g.canOpen(900)).toBe(false);
    expect(g.canOpen(1000)).toBe(true);
  });
});
