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
    expect(msg.text).toContain('Le bouton ne répond pas');
    expect(msg.text).toContain('Nouveau bug');
    expect(msg.text).toContain('Bloquant');
    expect(msg.text).toContain('jean@exemple.fr');
    expect(msg.text).toContain(':beetle:');
  });

  it('distingue une amélioration (icône ampoule + libellé)', () => {
    const msg = buildFeedbackMattermostMessage(
      notif({ kind: 'amelioration', severity: 'mineur' })
    );
    expect(msg.text).toContain('Nouveau amelioration');
    expect(msg.text).toContain(':bulb:');
    expect(msg.icon_emoji).toBe(':bulb:');
  });

  it('affiche le libellé lisible de l’app et la route', () => {
    const msg = buildFeedbackMattermostMessage(notif({ app: 'admin' }));
    expect(msg.text).toContain('Backoffice Admin');
    expect(msg.text).toContain('/configurateur');
  });

  it('distingue la source recette interne de la source widget', () => {
    const widget = buildFeedbackMattermostMessage(notif({ source: 'widget' }));
    const recette = buildFeedbackMattermostMessage(notif({ source: 'recette' }));
    expect(widget.text).toContain('Widget terrain');
    expect(recette.text).toContain('Centre de recette');
  });

  it('inclut la feature rattachée quand elle est fournie', () => {
    const msg = buildFeedbackMattermostMessage(
      notif({ source: 'recette', app: null, featureTitle: 'Connexion CRM' })
    );
    expect(msg.text).toContain('Connexion CRM');
  });

  it('omet le bloc description quand elle est vide', () => {
    const msg = buildFeedbackMattermostMessage(notif({ description: '   ' }));
    expect(msg.text).not.toContain('>');
  });

  it('tronque les descriptions très longues', () => {
    const long = 'a'.repeat(400);
    const msg = buildFeedbackMattermostMessage(notif({ description: long }));
    expect(msg.text).toContain('…');
    expect(msg.text).not.toContain('a'.repeat(400));
  });

  it('pointe vers le centre de recette', () => {
    const msg = buildFeedbackMattermostMessage(notif());
    expect(msg.text).toContain('/backoffice/recette');
  });
});
