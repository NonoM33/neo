import { describe, expect, it } from 'bun:test';
import { parseAddressFeatures, isCompleteAddress } from './address';

// Échantillon réel (réduit) de la réponse BAN pour "8 bd du port".
const banHouseNumber = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        label: '8 Boulevard du Port 80000 Amiens',
        name: '8 Boulevard du Port',
        housenumber: '8',
        street: 'Boulevard du Port',
        postcode: '80000',
        city: 'Amiens',
        score: 0.96,
        type: 'housenumber',
      },
    },
  ],
};

const banStreetOnly = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        label: 'Boulevard du Port 80000 Amiens',
        name: 'Boulevard du Port',
        postcode: '80000',
        city: 'Amiens',
        score: 0.72,
        type: 'street',
      },
    },
  ],
};

describe('parseAddressFeatures', () => {
  it('mappe une feature de type numéro de voie', () => {
    const [m] = parseAddressFeatures(banHouseNumber);
    expect(m).toMatchObject({
      name: '8 Boulevard du Port',
      housenumber: '8',
      postcode: '80000',
      city: 'Amiens',
      type: 'housenumber',
    });
    expect(m?.score).toBeCloseTo(0.96);
  });

  it('renvoie un tableau vide si la charge utile est invalide', () => {
    expect(parseAddressFeatures(null)).toEqual([]);
    expect(parseAddressFeatures({})).toEqual([]);
    expect(parseAddressFeatures({ features: 'x' })).toEqual([]);
  });

  it('retombe sur municipality pour un type inconnu', () => {
    const [m] = parseAddressFeatures({
      features: [{ properties: { label: 'X', type: 'bizarre' } }],
    });
    expect(m?.type).toBe('municipality');
  });
});

describe('isCompleteAddress', () => {
  it('valide une adresse au numéro de voie avec un bon score', () => {
    const [m] = parseAddressFeatures(banHouseNumber);
    expect(isCompleteAddress(m)).toBe(true);
  });

  it('rejette une adresse au niveau rue uniquement', () => {
    const [m] = parseAddressFeatures(banStreetOnly);
    expect(isCompleteAddress(m)).toBe(false);
  });

  it('rejette un numéro de voie au score trop faible', () => {
    const [m] = parseAddressFeatures({
      features: [
        { properties: { label: 'x', type: 'housenumber', score: 0.3 } },
      ],
    });
    expect(isCompleteAddress(m)).toBe(false);
  });

  it('rejette une valeur absente', () => {
    expect(isCompleteAddress(undefined)).toBe(false);
  });
});
