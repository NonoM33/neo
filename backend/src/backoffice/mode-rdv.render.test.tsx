import { describe, expect, it } from 'bun:test';
import { ProjectDetailPage } from './pages/projects/detail';
import { ClientDetailPage } from './pages/clients/detail';
import { PipelinePage } from './pages/crm/pipeline';
import { LeadDetailPage } from './pages/crm/lead-detail';
import type { AdminUser } from './middleware/admin-auth';

// Le Mode RDV (Layout) masque tout `.confidential` via `html.rdv-mode .confidential
// { display:none }`. Ces tests verrouillent le fait que les données internes —
// marge/coût d'un devis, notes internes et pipeline commercial — portent bien
// ce marqueur, sinon elles fuiraient à l'écran montré au client en rendez-vous.
async function renderToString(node: unknown): Promise<string> {
  return (await (node as { toString(): Promise<string> }).toString()) as string;
}

const user: AdminUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'commercial@neo.fr',
  firstName: 'Jean',
  lastName: 'Vendeur',
  role: 'admin',
  permissions: ['crm.manage'],
  isSuperAdmin: false,
};

describe('Mode RDV — projet detail', () => {
  it('marque la marge et le coût du devis comme confidentiels', async () => {
    const html = await renderToString(
      ProjectDetailPage({
        project: {
          id: 'p1', name: 'Domotique Dupont', description: null, status: 'en_cours',
          address: null, city: null, postalCode: null, surface: null, roomCount: 0,
          createdAt: new Date(), updatedAt: new Date(),
        },
        client: { id: 'c1', firstName: 'Marie', lastName: 'Dupont', email: null, phone: null, address: null, city: null },
        integrateur: { id: 'i1', firstName: 'Paul', lastName: 'Tech', email: 'paul@neo.fr' },
        rooms: [], photos: [], devices: [], checklist: [],
        quotes: [{
          id: 'q1', number: 'DEV-001', status: 'envoye',
          totalHT: '1000', totalTTC: '1200', totalCostHT: '600', totalMarginHT: '400',
          marginPercent: '40', validUntil: null, notes: null, pdfUrl: null,
          createdAt: new Date(), lines: [],
        }],
        comments: [],
        user,
      }) as unknown
    );

    // Badge marge
    expect(html).toContain('confidential">Marge 40.0%');
    // Lignes coût / marge € du résumé devis
    expect(html).toContain('class="confidential"><span class="text-muted">Cout:');
    expect(html).toContain('class="confidential"><span class="text-muted">Marge:');
  });
});

describe('Mode RDV — fiche client', () => {
  it('marque notes internes, pipeline (leads) et chat équipe comme confidentiels', async () => {
    const html = await renderToString(
      ClientDetailPage({
        client: {
          id: 'c1', firstName: 'Marie', lastName: 'Dupont', email: null, phone: null,
          address: null, city: null, postalCode: null,
          notes: 'Client pressé, négocie dur', createdAt: new Date(),
        },
        projects: [], quotes: [], activities: [], tickets: [],
        leads: [{ id: 'l1', title: 'Extension domotique', status: 'negociation', estimatedValue: '15000', createdAt: new Date() }],
        comments: [],
        user,
      }) as unknown
    );

    // Notes internes du client (carte sidebar)
    expect(html).toContain('card mb-4 confidential');
    // Pipeline commercial
    expect(html).toContain('card confidential');
    // Le chat équipe (CommentsThread) reste confidentiel
    expect(html.match(/confidential/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});

describe('Mode RDV — pipeline CRM', () => {
  it('marque la prévision (valeur/proba leads + totaux pondérés) comme confidentielle', async () => {
    const html = await renderToString(
      PipelinePage({
        leads: [{
          id: 'l1', firstName: 'Marie', lastName: 'Dupont', email: null, company: null,
          title: 'Extension domotique', status: 'negociation', source: 'site_web',
          estimatedValue: '15000', probability: 60, expectedCloseDate: null, createdAt: new Date(),
        }],
        projects: [],
        stats: [{ status: 'negociation', count: 1, totalValue: '15000', weightedValue: '9000' }],
        projectStats: { brouillon: 0, en_cours: 0, termine: 0 },
        user,
      }) as unknown
    );

    // Ligne valeur+probabilité de la carte lead
    expect(html).toContain('align-items-center mt-1 confidential');
    // Totaux de prévision (valeur pipeline + pondérée)
    expect(html).toContain('pipeline-summary-item confidential');
  });
});

describe('Mode RDV — fiche lead', () => {
  async function renderLead(): Promise<string> {
    return renderToString(
      LeadDetailPage({
        lead: {
          id: 'l1', firstName: 'Azzedine', lastName: 'Test', email: 'azzed123@gmail.com',
          phone: '0607080900', company: null, title: 'Demande de RDV via chatbot',
          description: 'Besoin : découverte domotique', status: 'prospect', source: 'site_web',
          estimatedValue: '15000', probability: 60, address: null, city: null, postalCode: null,
          surface: null, expectedCloseDate: null, convertedProjectId: null, convertedAt: null,
          lostReason: null, createdAt: new Date(), updatedAt: new Date(),
          activities: [], stageHistory: [],
        },
        comments: [],
        user,
      }) as unknown
    );
  }

  it('marque la carte Financier (valeur estimée/probabilité/pondérée) comme confidentielle', async () => {
    const html = await renderLead();
    expect(html).toContain('card mb-4 confidential');
    expect(html).toContain('Valeur estimee');
  });

  it('le toggle Mode RDV est câblé en délégation (fiable même après swap DOM)', async () => {
    const html = await renderLead();
    // Régression : le listener n'était posé qu'au DOMContentLoaded sur le bouton
    // nommé ; en délégation sur document il réagit toujours au clic.
    expect(html).toContain('#rdvToggle');
    expect(html).toContain("addEventListener('click'");
    expect(html).toContain('html.rdv-mode .confidential');
  });

  it("le script inline n'est PAS HTML-échappé (sinon SyntaxError, toggle mort)", async () => {
    const html = await renderLead();
    // Régression : Hono échappe ' → &#39; dans le contenu d'un <script>{`..`}</script>,
    // ce qui casse le JS ("Unexpected token '&'"). Rendu via dangerouslySetInnerHTML,
    // les quotes restent brutes.
    expect(html).toContain("getItem('neoRdvMode')");
    expect(html).not.toContain('getItem(&#39;neoRdvMode&#39;)');
    expect(html).not.toContain('addEventListener(&#39;click&#39;');
  });
});
