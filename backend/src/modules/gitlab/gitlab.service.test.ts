import { describe, expect, it } from 'bun:test';
import { buildIssuePayload, type RecetteIssueInput } from './gitlab.service';

const baseInput: RecetteIssueInput = {
  feature: {
    app: 'admin',
    module: 'Utilisateurs',
    title: 'Creer un utilisateur',
    code: 'admin-users-create',
    route: '/backoffice/users/new',
  },
  feedback: {
    title: 'Le bouton enregistrer ne reagit pas',
    severity: 'bloquant',
    stepsToReproduce: '1. Ouvrir le formulaire\n2. Cliquer sur Enregistrer',
    expectedResult: "L'utilisateur est cree",
    actualResult: 'Rien ne se passe',
    author: 'Jean Dupont',
  },
};

describe('buildIssuePayload', () => {
  it('prefixe le titre avec [Recette] et le module', () => {
    const payload = buildIssuePayload(baseInput);
    expect(payload.title).toBe(
      '[Recette] Utilisateurs — Le bouton enregistrer ne reagit pas'
    );
  });

  it('inclut les sections structurees attendu/obtenu/etapes', () => {
    const { description } = buildIssuePayload(baseInput);
    expect(description).toContain('### Etapes pour reproduire');
    expect(description).toContain('### Resultat attendu');
    expect(description).toContain('### Resultat obtenu');
    expect(description).toContain("L'utilisateur est cree");
    expect(description).toContain('Rien ne se passe');
  });

  it('inclut feature, app, severite et auteur dans le corps', () => {
    const { description } = buildIssuePayload(baseInput);
    expect(description).toContain('admin-users-create');
    expect(description).toContain('Backoffice Admin');
    expect(description).toContain('Bloquant');
    expect(description).toContain('Jean Dupont');
    expect(description).toContain('/backoffice/users/new');
  });

  it('genere des labels recette/app/severite', () => {
    const { labels } = buildIssuePayload(baseInput);
    expect(labels).toEqual(['recette', 'app::admin', 'severite::bloquant']);
  });

  it('omet les sections optionnelles absentes', () => {
    const { description } = buildIssuePayload({
      feature: { ...baseInput.feature, route: null },
      feedback: {
        title: 'Souci visuel',
        severity: 'cosmetique',
        stepsToReproduce: null,
        expectedResult: null,
        actualResult: null,
        author: 'Anonyme',
      },
    });
    expect(description).not.toContain('### Etapes pour reproduire');
    expect(description).not.toContain('### Resultat attendu');
    expect(description).not.toContain('**Ecran**');
  });
});
