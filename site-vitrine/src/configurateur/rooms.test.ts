import { describe, expect, it } from 'bun:test';
import {
  addRoom,
  removeRoom,
  resolveActiveRooms,
  roomCategories,
  slugifyRoomKey,
} from './rooms';

describe('slugifyRoomKey', () => {
  it('translitère accents et espaces en kebab-case', () => {
    expect(slugifyRoomKey('Salle de bain', [])).toBe('salle-de-bain');
    expect(slugifyRoomKey('Bureau été', [])).toBe('bureau-ete');
  });
  it('évite les collisions avec un suffixe numérique', () => {
    expect(slugifyRoomKey('Bureau', ['bureau'])).toBe('bureau-2');
    expect(slugifyRoomKey('Bureau', ['bureau', 'bureau-2'])).toBe('bureau-3');
  });
  it('retombe sur « piece » si le nom ne produit aucun caractère', () => {
    expect(slugifyRoomKey('!!!', [])).toBe('piece');
    expect(slugifyRoomKey('!!!', ['piece'])).toBe('piece-2');
  });
});

describe('addRoom / removeRoom', () => {
  it('ajoute sans doublon en préservant l’ordre', () => {
    expect(addRoom(['salon'], 'cuisine')).toEqual(['salon', 'cuisine']);
    expect(addRoom(['salon', 'cuisine'], 'salon')).toEqual(['salon', 'cuisine']);
  });
  it('retire une pièce', () => {
    expect(removeRoom(['salon', 'cuisine'], 'salon')).toEqual(['cuisine']);
    expect(removeRoom(['salon'], 'absent')).toEqual(['salon']);
  });
  it('ne mute pas le tableau source', () => {
    const src = ['salon'];
    addRoom(src, 'cuisine');
    removeRoom(src, 'salon');
    expect(src).toEqual(['salon']);
  });
});

describe('roomCategories', () => {
  const all = ['Audio', 'Éclairage', 'Chauffage', 'Volets', 'Sécurité', 'Réseau'];

  it('expose TOUT le catalogue même pour une pièce au sous-ensemble restreint', () => {
    // Régression : la Cuisine n'offrait que 3 catégories alors qu'une pièce
    // sur-mesure offrait tout → certaines pièces avaient moins de choix.
    const cuisine = { cats: ['Éclairage', 'Chauffage', 'Sécurité'] };
    expect(roomCategories(all, cuisine).slice().sort()).toEqual(all.slice().sort());
  });

  it('place les catégories favorites de la pièce en premier', () => {
    const entree = { cats: ['Sécurité', 'Éclairage'] };
    expect(roomCategories(all, entree)).toEqual([
      'Sécurité', 'Éclairage', 'Audio', 'Chauffage', 'Volets', 'Réseau',
    ]);
  });

  it('renvoie le catalogue tel quel pour une pièce sans favoris', () => {
    expect(roomCategories(all, {})).toEqual(all);
    expect(roomCategories(all)).toEqual(all);
  });

  it('ignore les favoris absents du catalogue', () => {
    expect(roomCategories(all, { cats: ['Inexistant', 'Audio'] })).toEqual([
      'Audio', 'Éclairage', 'Chauffage', 'Volets', 'Sécurité', 'Réseau',
    ]);
  });

  it('ne duplique pas une catégorie favorite répétée', () => {
    const out = roomCategories(all, { cats: ['Audio', 'Audio'] });
    expect(out.filter((c) => c === 'Audio')).toHaveLength(1);
    expect(out).toHaveLength(all.length);
  });
});

describe('resolveActiveRooms', () => {
  it('ne fige PAS la liste tant qu’aucune pièce n’est disponible', () => {
    // Régression : au boot, show(1) → updateCount() → houseRooms() appelait
    // ensureActiveRooms AVANT le chargement du catalogue. availableRooms()
    // renvoyait [] et la liste se figeait à vide → 0 pièce pour toujours,
    // même une fois le catalogue arrivé.
    expect(resolveActiveRooms(null, [])).toBeNull();
  });

  it('initialise sur les pièces disponibles dès qu’il y en a', () => {
    expect(resolveActiveRooms(null, ['salon', 'cuisine'])).toEqual(['salon', 'cuisine']);
  });

  it('renvoie une COPIE des pièces disponibles (pas la référence)', () => {
    const available = ['salon'];
    const out = resolveActiveRooms(null, available);
    expect(out).toEqual(['salon']);
    expect(out).not.toBe(available);
  });

  it('préserve un choix déjà figé, même volontairement vide', () => {
    expect(resolveActiveRooms([], ['salon'])).toEqual([]);
    expect(resolveActiveRooms(['chambre'], ['salon', 'cuisine'])).toEqual(['chambre']);
  });
});
