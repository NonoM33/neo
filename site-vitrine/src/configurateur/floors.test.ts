import { describe, expect, it } from 'bun:test';
import {
  floorLabel,
  floorPickerOptions,
  floorsOf,
  groupRoomsByFloor,
  type RoomOnFloor,
} from './floors';

describe('floorLabel', () => {
  it('nomme le rez-de-chaussée', () => {
    expect(floorLabel(0)).toBe('RDC');
  });
  it('nomme les étages positifs', () => {
    expect(floorLabel(1)).toBe('Étage 1');
    expect(floorLabel(3)).toBe('Étage 3');
  });
  it('nomme les sous-sols', () => {
    expect(floorLabel(-1)).toBe('Sous-sol 1');
    expect(floorLabel(-2)).toBe('Sous-sol 2');
  });
});

describe('floorsOf', () => {
  it('retourne [0] quand aucune pièce n’a d’étage', () => {
    expect(floorsOf([{ key: 'salon' }, { key: 'cuisine' }])).toEqual([0]);
  });
  it('déduplique et trie du plus haut au plus bas', () => {
    const rooms: RoomOnFloor[] = [
      { key: 'cave', floor: -1 },
      { key: 'salon', floor: 0 },
      { key: 'chambre', floor: 1 },
      { key: 'bureau', floor: 1 },
    ];
    expect(floorsOf(rooms)).toEqual([1, 0, -1]);
  });
  it('inclut toujours le RDC même sans pièce au RDC', () => {
    expect(floorsOf([{ key: 'chambre', floor: 2 }])).toEqual([2, 0]);
  });
  it('traite un étage absent/0 comme RDC', () => {
    expect(floorsOf([{ key: 'a', floor: 0 }, { key: 'b' }])).toEqual([0]);
  });
});

describe('floorPickerOptions', () => {
  it('propose un étage au-dessus et un sous-sol en dessous du RDC seul', () => {
    expect(floorPickerOptions([0], 0)).toEqual([1, 0, -1]);
  });

  it('étend vers le haut quand on sélectionne le nouvel étage du dessus', () => {
    // L'utilisateur a cliqué « Étage 1 + » : on doit désormais offrir « Étage 2 + ».
    expect(floorPickerOptions([0], 1)).toEqual([2, 1, 0, -1]);
  });

  it('étend vers le bas quand on sélectionne le nouveau sous-sol', () => {
    expect(floorPickerOptions([0], -1)).toEqual([1, 0, -1, -2]);
  });

  it('conserve les niveaux existants et ajoute un cran de chaque côté', () => {
    expect(floorPickerOptions([1, 0, -1], 0)).toEqual([2, 1, 0, -1, -2]);
  });

  it('comble les trous entre le pending et les niveaux présents', () => {
    // Pièces à l'étage 2 et au RDC, l'utilisateur vise « Étage 3 + ».
    expect(floorPickerOptions([2, 0], 3)).toEqual([4, 3, 2, 1, 0, -1]);
  });

  it('dédoublonne et reste trié du haut vers le bas', () => {
    expect(floorPickerOptions([0, 0, 1], 1)).toEqual([2, 1, 0, -1]);
  });
});

describe('groupRoomsByFloor', () => {
  const rooms: RoomOnFloor[] = [
    { key: 'salon', floor: 0 },
    { key: 'chambre', floor: 1 },
    { key: 'cave', floor: -1 },
    { key: 'bureau', floor: 1 },
  ];

  it('groupe les pièces par étage, du haut vers le bas', () => {
    const groups = groupRoomsByFloor(rooms);
    expect(groups.map((g) => g.floor)).toEqual([1, 0, -1]);
    expect(groups.map((g) => g.label)).toEqual(['Étage 1', 'RDC', 'Sous-sol 1']);
    expect(groups[0].rooms.map((r) => r.key)).toEqual(['chambre', 'bureau']);
    expect(groups[1].rooms.map((r) => r.key)).toEqual(['salon']);
    expect(groups[2].rooms.map((r) => r.key)).toEqual(['cave']);
  });

  it('préserve l’ordre source des pièces au sein d’un étage', () => {
    const same: RoomOnFloor[] = [
      { key: 'b', floor: 0 },
      { key: 'a', floor: 0 },
      { key: 'c', floor: 0 },
    ];
    expect(groupRoomsByFloor(same)[0].rooms.map((r) => r.key)).toEqual(['b', 'a', 'c']);
  });

  it('expose toujours un groupe RDC, même vide', () => {
    const groups = groupRoomsByFloor([{ key: 'attic', floor: 1 }]);
    const rdc = groups.find((g) => g.floor === 0);
    expect(rdc).toBeDefined();
    expect(rdc?.rooms).toEqual([]);
  });
});
