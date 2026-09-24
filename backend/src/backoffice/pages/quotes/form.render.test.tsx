import { describe, expect, it } from 'bun:test';
import { QuoteFormPage } from './form';
import { ProjectFormPage } from '../projects/form';
import type { AdminUser } from '../../middleware/admin-auth';

// Le formulaire et le parseur (quote-form.parse.ts) doivent parler le meme
// langage : si un `name=` change ici sans changer la-bas, la ligne disparait
// en silence a l'envoi. Ces tests verrouillent ce contrat de noms.

async function renderToString(node: any): Promise<string> {
  return (await node.toString()) as string;
}

const admin: AdminUser = {
  id: 'user-1',
  email: 'admin@neo.fr',
  firstName: 'Renaud',
  lastName: 'Cosson',
  role: 'admin',
  permissions: [],
  isSuperAdmin: true,
};

const client = { id: 'client-42', firstName: 'Test', lastName: 'Louei' };

const product = {
  id: 'prod-1',
  reference: 'SHELLY-1',
  name: 'Module Shelly',
  priceHT: '24.90',
  tvaRate: '20.00',
};

describe('QuoteFormPage', () => {
  it('poste les champs attendus par le parseur', async () => {
    const html = await renderToString(
      QuoteFormPage({ projects: [], products: [product], client, user: admin }) as any
    );

    expect(html).toContain('action="/backoffice/quotes"');
    for (const field of [
      'name="projectId"',
      'name="clientId"',
      'name="newProjectName"',
      'name="lineProductId"',
      'name="lineDescription"',
      'name="lineQuantity"',
      'name="lineUnitPriceHT"',
      'name="lineTvaRate"',
      'name="discount"',
      'name="validUntil"',
      'name="notes"',
    ]) {
      expect(html).toContain(field);
    }
  });

  it('preselectionne la creation de projet quand le client n en a aucun', async () => {
    const html = await renderToString(
      QuoteFormPage({ projects: [], products: [], client, user: admin }) as any
    );

    expect(html).toContain('value="__new__"');
    expect(html).toContain('Projet Test Louei');
  });

  it("n'offre pas la creation de projet a la volee hors d'une fiche client", async () => {
    const html = await renderToString(
      QuoteFormPage({
        projects: [{ id: 'proj-1', name: 'Installation', clientName: 'Test Louei' }],
        products: [],
        user: admin,
      }) as any
    );

    expect(html).not.toContain('value="__new__"');
    expect(html).toContain('/backoffice/projects/new');
  });

  // Sans ca, un devis refuse par le serveur revient vide et tout est a retaper.
  it('reaffiche la saisie apres une erreur', async () => {
    const html = await renderToString(
      QuoteFormPage({
        projects: [{ id: 'proj-1', name: 'Installation', clientName: 'Test Louei' }],
        products: [product],
        client,
        values: {
          projectId: 'proj-1',
          clientId: 'client-42',
          newProjectName: '',
          discount: '15',
          validUntil: '2026-12-31',
          notes: 'Remise geste commercial',
          lines: [
            { description: 'Pose interrupteur', quantity: '2', unitPriceHT: '80', tvaRate: '20' },
            { productId: 'prod-1', description: 'Module Shelly', quantity: '4', unitPriceHT: '24.90', tvaRate: '5.5' },
          ],
        },
        error: 'Prix unitaire doit etre positif',
        user: admin,
      }) as any
    );

    expect(html).toContain('Prix unitaire doit etre positif');
    expect(html).toContain('value="Pose interrupteur"');
    expect(html).toContain('value="Module Shelly"');
    expect(html).toContain('value="24.90"');
    expect(html).toContain('value="5.5"');
    expect(html).toContain('value="15"');
    expect(html).toContain('value="2026-12-31"');
    expect(html).toContain('Remise geste commercial');
    // Le projet choisi et le produit de la 2e ligne restent selectionnes.
    expect(html).toContain('<option value="proj-1" selected="">');
    expect(html).toContain('<option value="prod-1" selected=""');
  });

  it('expose les produits avec leur prix pour le pre-remplissage des lignes', async () => {
    const html = await renderToString(
      QuoteFormPage({ projects: [], products: [product], client, user: admin }) as any
    );

    expect(html).toContain('data-price="24.90"');
    expect(html).toContain('data-tva="20.00"');
  });
});

describe('ProjectFormPage', () => {
  it('preselectionne le client d ou l on vient et poste sur /backoffice/projects', async () => {
    const html = await renderToString(
      ProjectFormPage({
        clients: [{ id: 'client-42', firstName: 'Test', lastName: 'Louei' }],
        integrateurs: [{ id: 'user-1', firstName: 'Renaud', lastName: 'Cosson' }],
        preselectedClientId: 'client-42',
        user: admin,
      }) as any
    );

    expect(html).toContain('action="/backoffice/projects"');
    expect(html).toContain('<option value="client-42" selected="">');
    expect(html).toContain('href="/backoffice/clients/client-42"');
  });
});
