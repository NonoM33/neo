import { describe, expect, it } from 'bun:test';
import { buildClosureEmail } from './recette.notify';

describe('buildClosureEmail', () => {
  it('inclut le titre et le type dans le sujet et le corps', () => {
    const mail = buildClosureEmail({
      to: 'client@exemple.fr',
      title: 'Le bouton ne repond pas',
      kind: 'bug',
      resolution: 'Corrige dans la derniere version.',
    });

    expect(mail.subject).toContain('Le bouton ne repond pas');
    expect(mail.html).toContain('Le bouton ne repond pas');
    expect(mail.html).toContain('bug');
    expect(mail.text).toContain('Le bouton ne repond pas');
  });

  it('affiche la resolution de l equipe quand elle est fournie', () => {
    const mail = buildClosureEmail({
      to: 'client@exemple.fr',
      title: 'Idee de raccourci',
      kind: 'amelioration',
      resolution: 'Bonne idee, ajoute au menu.',
    });

    expect(mail.html).toContain("Reponse de l'equipe");
    expect(mail.html).toContain('Bonne idee, ajoute au menu.');
    expect(mail.text).toContain('Bonne idee, ajoute au menu.');
  });

  it('omet le bloc resolution quand il n y a pas de commentaire', () => {
    const mail = buildClosureEmail({
      to: 'client@exemple.fr',
      title: 'Sans reponse',
      kind: 'bug',
      resolution: null,
    });

    expect(mail.html).not.toContain("Reponse de l'equipe");
  });

  it('echappe le HTML present dans le titre et la resolution', () => {
    const mail = buildClosureEmail({
      to: 'client@exemple.fr',
      title: '<script>alert(1)</script>',
      kind: 'bug',
      resolution: '<b>oops</b>',
    });

    expect(mail.html).not.toContain('<script>alert(1)</script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&lt;b&gt;oops&lt;/b&gt;');
  });
});
