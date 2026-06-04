import { describe, expect, it } from 'bun:test';
import {
  buildFeedbackMattermostMessage,
  type FeedbackCreatedNotification,
} from './recette.mattermost';

function notif(
  over: Partial<FeedbackCreatedNotification> = {}
): FeedbackCreatedNotification {
  return {
    id: 'fb-1',
    kind: 'bug',
    severity: 'bloquant',
    source: 'widget',
    app: 'site',
    title: 'Le bouton ne répond pas',
    description: 'Cliquer sur Envoyer ne fait rien.',
    author: 'jean@exemple.fr',
    route: '/configurateur',
    featureTitle: null,
    ...over,
  };
}

describe('buildFeedbackMattermostMessage', () => {
  it('inclut le titre, le type, la sévérité et l’auteur pour un bug widget', () => {
    const msg = buildFeedbackMattermostMessage(notif());
    expect(msg).toContain('Le bouton ne répond pas');
    expect(msg).toContain('Nouveau bug');
    expect(msg).toContain('Bloquant');
    expect(msg).toContain('jean@exemple.fr');
    expect(msg).toContain(':beetle:');
  });

  it('distingue une amélioration (icône ampoule + libellé)', () => {
    const msg = buildFeedbackMattermostMessage(
      notif({ kind: 'amelioration', severity: 'mineur' })
    );
    expect(msg).toContain('Nouveau amelioration');
    expect(msg).toContain(':bulb:');
  });

  it('affiche le libellé lisible de l’app et la route', () => {
    const msg = buildFeedbackMattermostMessage(notif({ app: 'admin' }));
    expect(msg).toContain('Backoffice Admin');
    expect(msg).toContain('/configurateur');
  });

  it('distingue la source recette interne de la source widget', () => {
    const widget = buildFeedbackMattermostMessage(notif({ source: 'widget' }));
    const recette = buildFeedbackMattermostMessage(notif({ source: 'recette' }));
    expect(widget).toContain('Widget terrain');
    expect(recette).toContain('Centre de recette');
  });

  it('inclut la feature rattachée quand elle est fournie', () => {
    const msg = buildFeedbackMattermostMessage(
      notif({ source: 'recette', app: null, featureTitle: 'Connexion CRM' })
    );
    expect(msg).toContain('Connexion CRM');
  });

  it('omet le bloc description quand elle est vide', () => {
    const msg = buildFeedbackMattermostMessage(notif({ description: '   ' }));
    expect(msg).not.toContain('>');
  });

  it('tronque les descriptions très longues', () => {
    const long = 'a'.repeat(400);
    const msg = buildFeedbackMattermostMessage(notif({ description: long }));
    expect(msg).toContain('…');
    expect(msg).not.toContain('a'.repeat(400));
  });

  it('pointe vers le centre de recette', () => {
    const msg = buildFeedbackMattermostMessage(notif());
    expect(msg).toContain('/backoffice/recette');
  });
});
