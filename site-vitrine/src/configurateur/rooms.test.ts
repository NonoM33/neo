import { describe, expect, it } from 'bun:test';
import { addRoom, removeRoom, slugifyRoomKey } from './rooms';

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
