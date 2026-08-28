import { describe, expect, it } from 'bun:test';
import {
  DEVIS_CONFIRMATION_MESSAGE,
  buildDevisDescription,
  buildDevisLeadValues,
  pickLeastBusyOwner,
} from './devis.service';
import { publicDevisSchema, type PublicDevisInput } from './devis.schema';

function makeInput(overrides: Partial<PublicDevisInput> = {}): PublicDevisInput {
  return {
    housingType: 'maison',
    ownership: 'proprietaire',
    surface: 120,
    rooms: 5,
    projectKind: 'renovation',
    needs: ['eclairage', 'securite'],
    budget: '5000_10000',
    timeline: '1_3_mois',
    firstName: 'Marie',
    lastName: 'Lefevre',
    email: 'marie@example.com',
    phone: '0612345678',
    address: '10 rue de la Paix',
    postalCode: '75002',
    city: 'Paris',
    contactTime: 'matin',
    message: 'Je souhaite équiper toute la maison.',
    consent: true,
    ...overrides,
  };
}

describe('publicDevisSchema', () => {
  it('accepte un questionnaire complet et coerce les nombres', () => {
    const parsed = publicDevisSchema.parse({
      housingType: 'appartement',
      needs: ['chauffage'],
      surface: '85',
      rooms: '3',
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      phone: '0700000000',
      postalCode: '69001',
      consent: true,
    });
    expect(parsed.surface).toBe(85);
    expect(parsed.rooms).toBe(3);
    expect(parsed.needs).toEqual(['chauffage']);
  });

  it('rejette un code postal invalide', () => {
    const result = publicDevisSchema.safeParse(makeInput({ postalCode: '750' }));
    expect(result.success).toBe(false);
  });

  it('exige le consentement RGPD', () => {
    const result = publicDevisSchema.safeParse(makeInput({ consent: false }));
    expect(result.success).toBe(false);
  });

  it('refuse un honeypot rempli (bot)', () => {
    const result = publicDevisSchema.safeParse(
      makeInput({ website: 'http://spam' })
    );
    expect(result.success).toBe(false);
  });
});

describe('buildDevisDescription', () => {
  it('résume tous les champs du questionnaire en français', () => {
    const desc = buildDevisDescription(makeInput());
    expect(desc).toContain('Logement : Maison');
    expect(desc).toContain('Statut : Propriétaire');
    expect(desc).toContain('Type de projet : Rénovation');
    expect(desc).toContain('Surface : 120 m²');
    expect(desc).toContain('Nombre de pièces : 5');
    expect(desc).toContain('Éclairage intelligent');
    expect(desc).toContain('Sécurité / Alarme / Caméras');
    expect(desc).toContain('Budget : 5 000 € – 10 000 €');
    expect(desc).toContain('Délai : Dans 1 à 3 mois');
    expect(desc).toContain('Disponibilité : Le matin');
    expect(desc).toContain('Je souhaite équiper toute la maison.');
  });

  it('omet les champs optionnels absents', () => {
    const desc = buildDevisDescription(
      makeInput({
        ownership: undefined,
        projectKind: undefined,
        surface: undefined,
        rooms: undefined,
        budget: undefined,
        timeline: undefined,
        contactTime: undefined,
        message: undefined,
        needs: [],
      })
    );
    expect(desc).not.toContain('Statut :');
    expect(desc).not.toContain('Surface :');
    expect(desc).not.toContain('Besoins :');
    expect(desc).not.toContain('Budget :');
  });
});

describe('buildDevisLeadValues', () => {
  it('mappe le questionnaire vers un lead CRM site_web/prospect', () => {
    const values = buildDevisLeadValues(makeInput(), 'owner-1');
    expect(values.ownerId).toBe('owner-1');
    expect(values.status).toBe('prospect');
    expect(values.source).toBe('site_web');
    expect(values.firstName).toBe('Marie');
    expect(values.lastName).toBe('Lefevre');
    expect(values.title).toBe('Demande de devis — Maison');
    expect(values.surface).toBe('120');
    expect(values.address).toBe('10 rue de la Paix');
    expect(values.city).toBe('Paris');
    expect(values.postalCode).toBe('75002');
  });

  it('déduit la valeur estimée de la fourchette budgétaire', () => {
    expect(buildDevisLeadValues(makeInput({ budget: 'lt_2000' }), 'o').estimatedValue).toBe('1500');
    expect(buildDevisLeadValues(makeInput({ budget: '5000_10000' }), 'o').estimatedValue).toBe('7500');
    expect(buildDevisLeadValues(makeInput({ budget: 'gt_10000' }), 'o').estimatedValue).toBe('12000');
  });

  it('laisse la valeur estimée nulle si budget inconnu ou absent', () => {
    expect(buildDevisLeadValues(makeInput({ budget: 'inconnu' }), 'o').estimatedValue).toBeNull();
    expect(buildDevisLeadValues(makeInput({ budget: undefined }), 'o').estimatedValue).toBeNull();
  });

  it('met les champs de localisation optionnels à null', () => {
    const values = buildDevisLeadValues(
      makeInput({ address: undefined, city: undefined, surface: undefined }),
      'o'
    );
    expect(values.address).toBeNull();
    expect(values.city).toBeNull();
    expect(values.surface).toBeNull();
  });
});

describe('pickLeastBusyOwner', () => {
  it('retourne null sans candidat', () => {
    expect(pickLeastBusyOwner([], new Map())).toBeNull();
  });

  it('choisit le candidat avec le moins de leads ouverts', () => {
    const load = new Map([
      ['a', 5],
      ['b', 1],
      ['c', 3],
    ]);
    expect(pickLeastBusyOwner(['a', 'b', 'c'], load)).toBe('b');
  });

  it('traite un candidat absent de la map comme ayant 0 lead', () => {
    const load = new Map([['a', 4]]);
    expect(pickLeastBusyOwner(['a', 'b'], load)).toBe('b');
  });
});

describe('DEVIS_CONFIRMATION_MESSAGE', () => {
  it('invite le prospect à appeler le numéro de contact', () => {
    expect(DEVIS_CONFIRMATION_MESSAGE).toContain('07 78 57 18 19');
    expect(DEVIS_CONFIRMATION_MESSAGE.toLowerCase()).toContain('appelez-nous');
  });
});
