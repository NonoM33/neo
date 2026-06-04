import { describe, expect, it } from 'bun:test';
import { getToolDefinitions, executeTool, priceTTC } from './chatbot.tools';

describe('priceTTC', () => {
  it('applique le taux de TVA par défaut (20%)', () => {
    expect(priceTTC('100', null)).toBe(120);
  });

  it('applique un taux de TVA personnalisé', () => {
    expect(priceTTC('100', '10')).toBe(110);
  });

  it('arrondit à deux décimales', () => {
    expect(priceTTC('99.99', '20')).toBe(119.99);
  });

  it('renvoie null si le prix HT est absent', () => {
    expect(priceTTC(null, '20')).toBeNull();
  });

  it('renvoie null si le prix HT est invalide', () => {
    expect(priceTTC('abc', '20')).toBeNull();
  });

  it('retombe sur 20% si le taux est invalide', () => {
    expect(priceTTC('100', 'xyz')).toBe(120);
  });
});

describe('getToolDefinitions', () => {
  it('expose les 8 outils du chatbot', () => {
    const defs = getToolDefinitions();
    const names = defs.map((d) =>
      d.type === 'function' ? d.function.name : null
    );
    expect(names.sort()).toEqual(
      [
        'consulter_disponibilites',
        'creer_compte_client',
        'enregistrer_rdv',
        'lister_produits',
        'lister_types_rdv',
        'reconnaitre_client',
        'reserver_rdv',
        'verifier_adresse',
      ].sort()
    );
  });

  it('déclare reserver_rdv avec les coordonnées obligatoires', () => {
    const def = getToolDefinitions().find(
      (d) => d.type === 'function' && d.function.name === 'reserver_rdv'
    );
    expect(def).toBeDefined();
    if (def?.type !== 'function') throw new Error('definition introuvable');
    const params = def.function.parameters as {
      required?: string[];
    };
    expect(params.required).toEqual(
      expect.arrayContaining([
        'type',
        'date',
        'heure',
        'prenom',
        'nom',
        'email',
        'telephone',
        'adresse',
        'code_postal',
        'ville',
      ])
    );
  });
});

describe('executeTool', () => {
  it('renvoie une erreur pour un outil inconnu', async () => {
    const result = await executeTool({ sessionId: 's1' }, 'outil_bidon', '{}');
    expect(result).toEqual({
      success: false,
      message: 'Outil inconnu : outil_bidon',
    });
  });

  it('ne lève pas sur un JSON d’arguments invalide (outil inconnu)', async () => {
    const result = await executeTool(
      { sessionId: 's1' },
      'outil_bidon',
      'pas-du-json'
    );
    expect(result).toMatchObject({ success: false });
  });
});
