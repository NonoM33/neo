import { describe, expect, it } from 'bun:test';
import {
  buildCatalogDigest,
  buildContextMessage,
  resolveRoom,
  runTool,
  type ToolContext,
} from './configurateur.assistant';
import type { SuggestProduct } from './configurateur.suggest';
import type { AssistantInput } from './configurateur.assistant.schema';

const catalog: SuggestProduct[] = [
  { id: 'cam-pro', name: 'Caméra Pro', category: 'camera', priceTTC: 199, brand: 'Neo' },
  { id: 'cam-eco', name: 'Caméra Eco', category: 'camera', priceTTC: 89, brand: 'Neo' },
  { id: 'capteur', name: 'Capteur ouverture', category: 'capteur', priceTTC: 29, brand: 'Aqara' },
];

const rooms = [
  { key: 'salon', label: 'Salon' },
  { key: 'entree', label: 'Entrée' },
];

function ctx(): ToolContext {
  return { catalog, rooms, actions: [] };
}

describe('resolveRoom', () => {
  it('résout une pièce par sa clé technique', () => {
    expect(resolveRoom(ctx(), 'salon')).toBe('salon');
  });

  it('résout une pièce par son libellé lisible', () => {
    expect(resolveRoom(ctx(), 'Entrée')).toBe('entree');
  });

  it('refuse une pièce inconnue', () => {
    expect(resolveRoom(ctx(), 'garage')).toBeNull();
  });

  it('fait confiance quand aucune pièce n’est déclarée', () => {
    expect(resolveRoom({ catalog, rooms: [], actions: [] }, 'garage')).toBe('garage');
  });
});

describe('runTool · ajouter_equipement', () => {
  it('ajoute l’équipement au panier (action add) quand produit et pièce sont valides', async () => {
    // Régression : le bot DOIT pouvoir mettre un équipement dans une pièce.
    const c = ctx();
    const out = (await runTool(
      c,
      'ajouter_equipement',
      JSON.stringify({ productId: 'cam-pro', room: 'salon', quantity: 2 }),
    )) as { ok: boolean };

    expect(out.ok).toBe(true);
    expect(c.actions).toEqual([
      { type: 'add', productId: 'cam-pro', room: 'salon', quantity: 2 },
    ]);
  });

  it('accepte le libellé de pièce et le normalise en clé', async () => {
    const c = ctx();
    await runTool(
      c,
      'ajouter_equipement',
      JSON.stringify({ productId: 'capteur', room: 'Entrée' }),
    );
    expect(c.actions).toEqual([
      { type: 'add', productId: 'capteur', room: 'entree', quantity: 1 },
    ]);
  });

  it('quantité par défaut de 1 et plancher à 1', async () => {
    const c = ctx();
    await runTool(
      c,
      'ajouter_equipement',
      JSON.stringify({ productId: 'cam-eco', room: 'salon', quantity: 0 }),
    );
    expect(c.actions[0]?.quantity).toBe(1);
  });

  it('refuse un produit inconnu sans rien ajouter', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'ajouter_equipement',
      JSON.stringify({ productId: 'inexistant', room: 'salon' }),
    )) as { ok: boolean };
    expect(out.ok).toBe(false);
    expect(c.actions).toHaveLength(0);
  });

  it('refuse une pièce inconnue sans rien ajouter', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'ajouter_equipement',
      JSON.stringify({ productId: 'cam-pro', room: 'cave' }),
    )) as { ok: boolean };
    expect(out.ok).toBe(false);
    expect(c.actions).toHaveLength(0);
  });
});

describe('runTool · retirer_equipement', () => {
  it('retire un produit (action remove) avec quantité', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'retirer_equipement',
      JSON.stringify({ productId: 'cam-pro', room: 'salon', quantity: 1 }),
    )) as { ok: boolean };
    expect(out.ok).toBe(true);
    expect(c.actions).toEqual([
      { type: 'remove', productId: 'cam-pro', room: 'salon', quantity: 1 },
    ]);
  });

  it('retire tout (quantité 0) quand aucune quantité n’est précisée', async () => {
    const c = ctx();
    await runTool(
      c,
      'retirer_equipement',
      JSON.stringify({ productId: 'cam-pro', room: 'salon' }),
    );
    expect(c.actions[0]).toMatchObject({ type: 'remove', quantity: 0 });
  });
});

describe('runTool · rechercher_produits', () => {
  it('filtre par catégorie et prix TTC maximum', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'rechercher_produits',
      JSON.stringify({ category: 'camera', maxPriceTTC: 100 }),
    )) as { count: number; products: Array<{ id: string }> };
    expect(out.products.map((p) => p.id)).toEqual(['cam-eco']);
  });

  it('filtre par mot-clé dans le nom ou la marque', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'rechercher_produits',
      JSON.stringify({ query: 'aqara' }),
    )) as { products: Array<{ id: string }> };
    expect(out.products.map((p) => p.id)).toEqual(['capteur']);
  });
});

describe('buildCatalogDigest', () => {
  it('liste les produits groupés par leur catégorie réelle avec id et prix', () => {
    // Régression : l'IA cherchait « camera » alors que la catégorie réelle est
    // « Sécurité » → catalogue perçu comme vide. Le digest expose la vraie taxo.
    const digest = buildCatalogDigest(catalog);
    expect(digest).toContain('camera');
    expect(digest).toContain('cam-pro');
    expect(digest).toContain('Caméra Pro');
    expect(digest).toMatch(/199/);
    expect(digest).toContain('capteur');
  });

  it('reste vide-safe quand le catalogue est vide', () => {
    expect(buildCatalogDigest([])).toContain('vide');
  });
});

describe('buildContextMessage', () => {
  const baseInput: AssistantInput = {
    messages: [{ role: 'user', content: 'bonjour' }],
    selection: [{ productId: 'cam-pro', quantity: 2, room: 'salon' }],
    rooms,
  };

  it('décrit les pièces, le budget et le panier réel', () => {
    const msg = buildContextMessage({ ...baseInput, budget: 800 }, catalog);
    expect(msg).toContain('salon');
    expect(msg).toContain('Salon');
    expect(msg).toContain('2× Caméra Pro');
    expect(msg).toContain('[salon]');
    expect(msg).toMatch(/800/);
  });

  it('signale un panier vide', () => {
    const msg = buildContextMessage({ ...baseInput, selection: [] }, catalog);
    expect(msg).toContain('Panier actuel : vide.');
  });
});
