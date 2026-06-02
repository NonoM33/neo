import { describe, expect, it } from 'bun:test';
import { FeatureCard } from './feature-card';
import type { FeatureWithFeedback } from '../../../modules/recette/recette.service';

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
});
