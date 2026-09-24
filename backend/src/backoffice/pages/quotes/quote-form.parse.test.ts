import { describe, expect, it } from 'bun:test';
import { parseQuoteForm, readQuoteFormValues, NEW_PROJECT_VALUE } from './quote-form.parse';

// Contrat du formulaire (ecrit depuis la specification du formulaire, pas
// depuis le code) : le navigateur poste une occurrence de chaque champ
// `line*` par ligne, dans l'ordre du tableau. Hono renvoie une chaine quand
// il n'y a qu'une occurrence, un tableau au-dela.

describe('parseQuoteForm', () => {
  it('apparie les colonnes ligne a ligne quand il y a plusieurs lignes', () => {
    const res = parseQuoteForm({
      projectId: 'proj-1',
      lineProductId: ['', 'prod-9'],
      lineDescription: ['Pose interrupteur', 'Module Shelly'],
      lineQuantity: ['2', '3'],
      lineUnitPriceHT: ['80', '24.90'],
      lineTvaRate: ['20', '5.5'],
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.form.target).toEqual({ kind: 'project', projectId: 'proj-1' });
    expect(res.form.lines).toEqual([
      { description: 'Pose interrupteur', quantity: '2', unitPriceHT: '80', tvaRate: '20' },
      { productId: 'prod-9', description: 'Module Shelly', quantity: '3', unitPriceHT: '24.90', tvaRate: '5.5' },
    ]);
  });

  it('accepte une ligne unique postee en valeurs scalaires', () => {
    const res = parseQuoteForm({
      projectId: 'proj-1',
      lineProductId: '',
      lineDescription: 'Audit domotique',
      lineQuantity: '1',
      lineUnitPriceHT: '450',
      lineTvaRate: '20',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.form.lines).toHaveLength(1);
    expect(res.form.lines[0]!.description).toBe('Audit domotique');
  });

  it('ignore les lignes laissees vides sans faire echouer le devis', () => {
    const res = parseQuoteForm({
      projectId: 'proj-1',
      lineProductId: ['', ''],
      lineDescription: ['Audit domotique', '   '],
      lineQuantity: ['1', '1'],
      lineUnitPriceHT: ['450', ''],
      lineTvaRate: ['20', '20'],
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.form.lines).toHaveLength(1);
  });

  it('refuse un devis sans aucune ligne', () => {
    const res = parseQuoteForm({
      projectId: 'proj-1',
      lineDescription: [''],
      lineQuantity: ['1'],
      lineUnitPriceHT: [''],
      lineTvaRate: ['20'],
    });

    expect(res).toEqual({ ok: false, error: 'Ajoutez au moins une ligne au devis' });
  });

  it('refuse un devis sans projet selectionne', () => {
    const res = parseQuoteForm({
      lineDescription: 'X',
      lineQuantity: '1',
      lineUnitPriceHT: '10',
      lineTvaRate: '20',
    });

    expect(res).toEqual({ ok: false, error: 'Selectionnez un projet pour ce devis' });
  });

  // Le scenario remonte en recette : un client vient d'etre cree, il n'a donc
  // aucun projet, et l'on doit pouvoir lui faire un devis quand meme.
  it('cree le projet a la volee quand le client n a pas encore de projet', () => {
    const res = parseQuoteForm({
      projectId: NEW_PROJECT_VALUE,
      clientId: 'client-42',
      newProjectName: 'Installation Test Louei',
      lineDescription: 'Etude',
      lineQuantity: '1',
      lineUnitPriceHT: '300',
      lineTvaRate: '20',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.form.target).toEqual({
      kind: 'newProject',
      clientId: 'client-42',
      name: 'Installation Test Louei',
    });
  });

  it('refuse un nouveau projet sans nom', () => {
    const res = parseQuoteForm({
      projectId: NEW_PROJECT_VALUE,
      clientId: 'client-42',
      newProjectName: '  ',
      lineDescription: 'Etude',
      lineQuantity: '1',
      lineUnitPriceHT: '300',
      lineTvaRate: '20',
    });

    expect(res).toEqual({ ok: false, error: 'Nom du nouveau projet requis' });
  });

  it('refuse un nouveau projet sans client', () => {
    const res = parseQuoteForm({
      projectId: NEW_PROJECT_VALUE,
      newProjectName: 'Installation',
      lineDescription: 'Etude',
      lineQuantity: '1',
      lineUnitPriceHT: '300',
      lineTvaRate: '20',
    });

    expect(res).toEqual({ ok: false, error: 'Client requis pour creer un projet' });
  });

  it('applique les valeurs par defaut quantite 1 et TVA 20', () => {
    const res = parseQuoteForm({
      projectId: 'proj-1',
      lineDescription: 'Main d oeuvre',
      lineQuantity: '',
      lineUnitPriceHT: '55',
      lineTvaRate: '',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.form.lines[0]).toEqual({
      description: 'Main d oeuvre',
      quantity: '1',
      unitPriceHT: '55',
      tvaRate: '20',
    });
  });

  it('omet validUntil et notes quand ils sont vides (une date vide casserait la coercition)', () => {
    const res = parseQuoteForm({
      projectId: 'proj-1',
      validUntil: '',
      notes: '   ',
      lineDescription: 'X',
      lineQuantity: '1',
      lineUnitPriceHT: '10',
      lineTvaRate: '20',
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.form.validUntil).toBeUndefined();
    expect(res.form.notes).toBeUndefined();
    expect(res.form.discount).toBe('0');
  });
});

describe('readQuoteFormValues', () => {
  it('relit la saisie sans rien refuser, meme incomplete', () => {
    const values = readQuoteFormValues({
      projectId: '',
      clientId: 'client-42',
      newProjectName: '',
      discount: '15',
      validUntil: '2026-12-31',
      notes: 'Geste commercial',
      lineProductId: ['', 'prod-9'],
      lineDescription: ['Pose', 'Module'],
      lineQuantity: ['2', '4'],
      lineUnitPriceHT: ['80', '0'],
      lineTvaRate: ['20', '5.5'],
    });

    expect(values.projectId).toBe('');
    expect(values.discount).toBe('15');
    expect(values.validUntil).toBe('2026-12-31');
    expect(values.notes).toBe('Geste commercial');
    expect(values.lines).toHaveLength(2);
    expect(values.lines[1]).toEqual({
      productId: 'prod-9',
      description: 'Module',
      quantity: '4',
      unitPriceHT: '0',
      tvaRate: '5.5',
    });
  });
});
