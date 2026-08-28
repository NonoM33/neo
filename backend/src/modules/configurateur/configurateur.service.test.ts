import { describe, expect, it } from 'bun:test';
import {
  CONFIGURATEUR_CONFIRMATION_MESSAGE,
  buildConfiguratorDescription,
  buildConfiguratorLeadValues,
} from './configurateur.service';
import type { ConfiguratorEstimate } from './configurateur.pricing';
import type { SubmitInput } from './configurateur.schema';

function makeEstimate(overrides: Partial<ConfiguratorEstimate> = {}): ConfiguratorEstimate {
  return {
    lines: [
      {
        productId: 'a',
        name: 'Caméra extérieure',
        quantity: 2,
        unitPriceHT: 100,
        tvaRate: 20,
        totalHT: 200,
        totalTTC: 240,
        auto: false,
      },
      {
        productId: 'b',
        name: 'Centrale alarme',
        quantity: 1,
        unitPriceHT: 150,
        tvaRate: 20,
        totalHT: 150,
        totalTTC: 180,
        auto: true,
      },
    ],
    totalHT: 350,
    totalTVA: 70,
    totalTTC: 420,
    ...overrides,
  };
}

function makeInput(overrides: Partial<SubmitInput> = {}): SubmitInput {
  return {
    items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: 2 }],
    installMode: 'autonome',
    firstName: 'Marie',
    lastName: 'Lefevre',
    email: 'marie@example.com',
    phone: '0612345678',
    postalCode: '75002',
    surface: 90,
    consent: true,
    ...overrides,
  };
}

describe('buildConfiguratorDescription', () => {
  it('liste les équipements et marque les ajouts automatiques', () => {
    const desc = buildConfiguratorDescription(makeInput(), makeEstimate());

    expect(desc).toContain("Je l'installe moi-même");
    expect(desc).toContain('Surface : 90 m²');
    expect(desc).toContain('2× Caméra extérieure');
    expect(desc).toContain('1× Centrale alarme (ajouté automatiquement)');
    expect(desc).toContain('Total estimé');
  });
});

describe('buildConfiguratorLeadValues', () => {
  it('mappe la configuration vers un lead site_web avec la valeur estimée', () => {
    const values = buildConfiguratorLeadValues(makeInput(), makeEstimate(), 'owner-1');

    expect(values).toMatchObject({
      firstName: 'Marie',
      email: 'marie@example.com',
      status: 'prospect',
      source: 'site_web',
      ownerId: 'owner-1',
      postalCode: '75002',
      surface: '90',
      estimatedValue: '420.00',
    });
  });

  it('met estimatedValue à null pour une configuration vide', () => {
    const empty = makeEstimate({ lines: [], totalHT: 0, totalTVA: 0, totalTTC: 0 });
    const values = buildConfiguratorLeadValues(makeInput({ items: [] }), empty, 'owner-1');
    expect(values.estimatedValue).toBeNull();
  });
});

describe('CONFIGURATEUR_CONFIRMATION_MESSAGE', () => {
  it('invite le prospect à appeler le numéro de contact', () => {
    expect(CONFIGURATEUR_CONFIRMATION_MESSAGE).toContain('07 78 57 18 19');
    expect(CONFIGURATEUR_CONFIRMATION_MESSAGE.toLowerCase()).toContain('appelez-nous');
  });
});
