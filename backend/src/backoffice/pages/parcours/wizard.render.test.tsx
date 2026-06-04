import { describe, expect, it } from 'bun:test';
import { ParcoursWizardPage } from './wizard';

// Le shell injecte un token staff et la config dans window.__PARCOURS__, puis
// charge le bundle client. Si l'injection casse (échappement, JSON invalide),
// tout le parcours est mort à l'ouverture — ce test verrouille ce contrat.
async function renderToString(node: any): Promise<string> {
  // Hono JSX nodes exposent toString() async-friendly.
  return (await node.toString()) as string;
}

describe('ParcoursWizardPage', () => {
  it('injecte un bootstrap JSON parseable avec le token', async () => {
    const html = await renderToString(
      ParcoursWizardPage({ token: 'tok.en.123', userName: 'Jean Vendeur' }) as any
    );

    expect(html).toContain('window.__PARCOURS__ =');
    expect(html).toContain('/backoffice/parcours/app.js');

    const m = html.match(/window\.__PARCOURS__ = (\{.*?\});/s);
    expect(m).toBeTruthy();
    const cfg = JSON.parse(m![1]!);
    expect(cfg.token).toBe('tok.en.123');
    expect(cfg.apiBase).toBe('/api');
    expect(cfg.resumeProjectId).toBeNull();
  });

  it('propage le projet à reprendre', async () => {
    const html = await renderToString(
      ParcoursWizardPage({ token: 't', userName: 'X', resumeProjectId: 'proj-9' }) as any
    );
    const cfg = JSON.parse(html.match(/window\.__PARCOURS__ = (\{.*?\});/s)![1]!);
    expect(cfg.resumeProjectId).toBe('proj-9');
  });
});
