import { describe, expect, it } from 'bun:test';
import { FeatureCard } from './feature-card';
import { RecetteContent } from './list';
import type {
  FeatureWithFeedback,
  RecetteSummary,
} from '../../../modules/recette/recette.service';
import type { AdminUser } from '../../middleware/admin-auth';

const baseFeature: FeatureWithFeedback = {
  id: 'feat-1',
  code: 'demo',
  app: 'admin',
  module: 'Module',
  title: 'Feature demo',
  description: null,
  route: null,
  sortOrder: 0,
  validationStatus: 'a_tester',
  validatedBy: null,
  validatedAt: null,
  createdAt: new Date('2026-06-03T10:00:00Z'),
  updatedAt: new Date('2026-06-03T10:00:00Z'),
  feedback: [],
};

async function render(expanded: boolean): Promise<string> {
  const node = FeatureCard({
    feature: baseFeature,
    currentUserName: 'Jean Dupont',
    isAdminRoute: true,
    expanded,
  }) as unknown as { toString(): Promise<string> | string };
  return String(await node.toString());
}

describe('FeatureCard', () => {
  it('rend le corps deplie (collapse show) quand expanded', async () => {
    const html = await render(true);
    expect(html).toContain('id="feature-feat-1"');
    expect(html).toContain('collapse show');
  });

  it('rend le corps replie quand non expanded', async () => {
    const html = await render(false);
    expect(html).not.toContain('collapse show');
  });

  it('soumet les actions via HTMX cible sur la carte (pas de reload page)', async () => {
    const html = await render(true);
    expect(html).toContain('hx-post="/backoffice/recette/feature/feat-1/validation"');
    expect(html).toContain('hx-target="#feature-feat-1"');
    expect(html).toContain('hx-swap="outerHTML"');
  });

  it('guide le testeur avec les champs structures attendu/obtenu', async () => {
    const html = await render(true);
    expect(html).toContain('name="stepsToReproduce"');
    expect(html).toContain('name="expectedResult"');
    expect(html).toContain('name="actualResult"');
    expect(html).toContain('Que devait-il se passer ?');
    expect(html).toContain('a la place ?');
  });
});

const emptySummary: RecetteSummary = {
  totalFeatures: 1,
  featuresWithOpenIssues: 0,
  byStatus: { ouvert: 0, corrige: 0, valide: 0, a_revoir: 0 },
  bySeverity: { bloquant: 0, majeur: 0, mineur: 0, cosmetique: 0 },
  byValidation: { a_tester: 1, valide: 0, a_corriger: 0 },
  totalFeedback: 0,
};

const adminUser: AdminUser = {
  id: 'u1',
  email: 'admin@neo-domotique.fr',
  firstName: 'Admin',
  lastName: 'Neo',
  role: 'admin',
};

async function renderContent(): Promise<string> {
  const node = RecetteContent({
    features: [baseFeature],
    summary: emptySummary,
    widgetFeedback: [],
    filters: { app: 'admin' },
    user: adminUser,
  }) as unknown as { toString(): Promise<string> | string };
  return String(await node.toString());
}

describe('RecetteContent (filtres/resync sans rechargement)', () => {
  it('filtre via HTMX sur le bloc #recette-content, jamais toute la page', async () => {
    const html = await renderContent();
    expect(html).toContain('id="recette-content"');
    expect(html).toContain('hx-get="/backoffice/recette"');
    expect(html).toContain('hx-target="#recette-content"');
    expect(html).toContain('hx-swap="outerHTML"');
  });

  it('resynchronise le catalogue via HTMX (POST seed cible sur le bloc)', async () => {
    const html = await renderContent();
    expect(html).toContain('hx-post="/backoffice/recette/seed"');
  });

  it('ne contient aucun formulaire imbrique (HTML invalide)', async () => {
    const html = await renderContent();
    // Un <form ...> ne doit jamais en contenir un autre avant sa fermeture.
    const firstFormStart = html.indexOf('<form');
    const firstFormEnd = html.indexOf('</form>', firstFormStart);
    const between = html.slice(firstFormStart + 5, firstFormEnd);
    expect(between).not.toContain('<form');
  });
});
