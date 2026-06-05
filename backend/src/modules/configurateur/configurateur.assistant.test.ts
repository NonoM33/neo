import { describe, expect, it } from 'bun:test';
import {
  buildCatalogDigest,
  buildContextMessage,
  normalizeChoices,
  resolveRoom,
  runAssistantLoop,
  runTool,
  type AssistantTurn,
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
  return { catalog, rooms: rooms.map((r) => ({ ...r })), actions: [] };
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
    expect(c.actions[0]).toMatchObject({ type: 'add', quantity: 1 });
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

describe('runTool · gestion des pièces', () => {
  it('ajoute une pièce sur-mesure et la rend disponible dans le même tour', async () => {
    // L'utilisateur veut que Léo contrôle TOUT le configurateur, y compris créer
    // les pièces. Après création, le bot doit pouvoir y placer un équipement.
    const c = ctx();
    const out = (await runTool(
      c,
      'ajouter_piece',
      JSON.stringify({ name: 'Buanderie', floor: 1 }),
    )) as { ok: boolean; room: { key: string; label: string; floor?: number } };

    expect(out.ok).toBe(true);
    expect(out.room.label).toBe('Buanderie');
    expect(out.room.floor).toBe(1);
    expect(c.actions).toEqual([
      { type: 'add_room', room: out.room.key, label: 'Buanderie', floor: 1 },
    ]);
    // La pièce est immédiatement résolvable pour un ajout d'équipement.
    expect(resolveRoom(c, out.room.key)).toBe(out.room.key);
  });

  it('évite les collisions de clé avec une pièce existante', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'ajouter_piece',
      JSON.stringify({ name: 'Salon' }),
    )) as { ok: boolean; room: { key: string } };
    expect(out.ok).toBe(true);
    expect(out.room.key).not.toBe('salon');
  });

  it('refuse une pièce au nom vide', async () => {
    const c = ctx();
    const out = (await runTool(c, 'ajouter_piece', JSON.stringify({ name: '   ' }))) as {
      ok: boolean;
    };
    expect(out.ok).toBe(false);
    expect(c.actions).toHaveLength(0);
  });

  it('renomme une pièce existante', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'renommer_piece',
      JSON.stringify({ room: 'salon', name: 'Salon TV' }),
    )) as { ok: boolean };
    expect(out.ok).toBe(true);
    expect(c.actions).toEqual([{ type: 'rename_room', room: 'salon', label: 'Salon TV' }]);
    expect(c.rooms.find((r) => r.key === 'salon')?.label).toBe('Salon TV');
  });

  it('refuse de renommer une pièce inconnue', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'renommer_piece',
      JSON.stringify({ room: 'cave', name: 'Cellier' }),
    )) as { ok: boolean };
    expect(out.ok).toBe(false);
    expect(c.actions).toHaveLength(0);
  });

  it('supprime une pièce existante', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'supprimer_piece',
      JSON.stringify({ room: 'Entrée' }),
    )) as { ok: boolean };
    expect(out.ok).toBe(true);
    expect(c.actions).toEqual([{ type: 'remove_room', room: 'entree' }]);
    expect(c.rooms.find((r) => r.key === 'entree')).toBeUndefined();
  });

  it('change l’étage d’une pièce', async () => {
    const c = ctx();
    const out = (await runTool(
      c,
      'changer_etage_piece',
      JSON.stringify({ room: 'salon', floor: 2 }),
    )) as { ok: boolean };
    expect(out.ok).toBe(true);
    expect(c.actions).toEqual([{ type: 'set_room_floor', room: 'salon', floor: 2 }]);
    expect(c.rooms.find((r) => r.key === 'salon')?.floor).toBe(2);
  });
});

describe('runAssistantLoop', () => {
  // Enchaîne des tours de modèle scriptés sans appeler le vrai LLM.
  function scripted(turns: AssistantTurn[]): () => Promise<AssistantTurn | null> {
    let i = 0;
    return () => Promise.resolve(turns[i++] ?? null);
  }

  it('conserve le texte du message quand le modèle l’écrit en même temps qu’un appel d’outil, puis renvoie un tour final vide', async () => {
    // Régression EXACTE du bug remonté : « Désolé, je n'ai pas pu répondre. »
    // Le modèle dit sa réponse ET appelle proposer_choix dans le même tour,
    // puis le tour suivant n'a plus rien à ajouter (content vide). Le reply ne
    // doit PAS être vide : on garde le dernier texte non vide.
    const c: ToolContext = { catalog, rooms: [], actions: [], choices: [] };
    const create = scripted([
      {
        content: 'Voici 3 capteurs Ajax adaptés à ton alarme.',
        tool_calls: [
          {
            id: 't1',
            type: 'function',
            function: {
              name: 'proposer_choix',
              arguments: JSON.stringify({
                choices: [
                  { label: 'Détecteurs de mouvement', send: 'Ajoute des MotionProtect' },
                  { label: 'Capteurs d’ouverture', send: 'Ajoute des DoorProtect' },
                ],
              }),
            },
          },
        ],
      },
      { content: '', tool_calls: [] },
    ]);

    const out = await runAssistantLoop(c, [], create);
    expect(out.reply).toBe('Voici 3 capteurs Ajax adaptés à ton alarme.');
    expect(out.choices.map((x) => x.label)).toEqual([
      'Détecteurs de mouvement',
      'Capteurs d’ouverture',
    ]);
  });

  it('renvoie directement le texte quand il n’y a aucun appel d’outil', async () => {
    const c: ToolContext = { catalog, rooms: [], actions: [], choices: [] };
    const out = await runAssistantLoop(
      c,
      [],
      scripted([{ content: 'Bonjour, comment puis-je aider ?', tool_calls: [] }]),
    );
    expect(out.reply).toBe('Bonjour, comment puis-je aider ?');
  });

  it('retombe sur un texte de repli si le modèle ne dit jamais rien', async () => {
    const c: ToolContext = { catalog, rooms: [], actions: [], choices: [] };
    const out = await runAssistantLoop(c, [], scripted([{ content: '', tool_calls: [] }]));
    expect(out.reply.length).toBeGreaterThan(0);
  });
});

describe('normalizeChoices', () => {
  it('garde les boutons valides (label + send) en limitant le format', () => {
    expect(
      normalizeChoices([
        { label: 'Oui, retire-la', send: 'Retire la Sonos Arc' },
        { label: 'Garde tout', send: 'Garde tout, ne change rien' },
      ]),
    ).toEqual([
      { label: 'Oui, retire-la', send: 'Retire la Sonos Arc' },
      { label: 'Garde tout', send: 'Garde tout, ne change rien' },
    ]);
  });

  it('utilise le label comme message quand send est absent', () => {
    expect(normalizeChoices([{ label: 'Optimise mon panier' }])).toEqual([
      { label: 'Optimise mon panier', send: 'Optimise mon panier' },
    ]);
  });

  it('ignore les entrées sans label exploitable', () => {
    expect(
      normalizeChoices([{ label: '   ' }, { send: 'sans label' }, 'pas un objet', null]),
    ).toEqual([]);
  });

  it('déduplique par label (insensible à la casse) et plafonne à 4 boutons', () => {
    const out = normalizeChoices([
      { label: 'Oui' },
      { label: 'oui' },
      { label: 'A' },
      { label: 'B' },
      { label: 'C' },
      { label: 'D' },
    ]);
    expect(out.map((c) => c.label)).toEqual(['Oui', 'A', 'B', 'C']);
  });

  it('renvoie une liste vide pour une entrée non-tableau', () => {
    expect(normalizeChoices(undefined)).toEqual([]);
    expect(normalizeChoices({})).toEqual([]);
  });
});

describe('runTool · proposer_choix', () => {
  it('enregistre les choix cliquables contextuels dans le contexte', async () => {
    // L'utilisateur veut des messages avec des boutons cliquables (façon bot
    // Telegram) : le guide propose 2 à 4 réponses rapides contextuelles.
    const c: ToolContext = { catalog, rooms: [], actions: [], choices: [] };
    const out = (await runTool(
      c,
      'proposer_choix',
      JSON.stringify({
        choices: [
          { label: 'Oui, retire-la', send: 'Retire la Sonos Arc' },
          { label: 'Une alternative ?', send: 'Propose une alternative moins chère' },
        ],
      }),
    )) as { ok: boolean; count: number };

    expect(out.ok).toBe(true);
    expect(out.count).toBe(2);
    expect(c.choices).toEqual([
      { label: 'Oui, retire-la', send: 'Retire la Sonos Arc' },
      { label: 'Une alternative ?', send: 'Propose une alternative moins chère' },
    ]);
  });

  it('remplace les choix précédents par le dernier appel', async () => {
    const c: ToolContext = {
      catalog,
      rooms: [],
      actions: [],
      choices: [{ label: 'ancien', send: 'ancien' }],
    };
    await runTool(c, 'proposer_choix', JSON.stringify({ choices: [{ label: 'neuf' }] }));
    expect(c.choices).toEqual([{ label: 'neuf', send: 'neuf' }]);
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
