import { describe, expect, it } from 'bun:test';
import { buildNewConversationMessage, staffConsoleUrl } from './chatbot.notify';

describe('staffConsoleUrl', () => {
  it('pointe vers la console staff avec la session en query', () => {
    const url = staffConsoleUrl('abc-123');
    expect(url).toContain('/backoffice/support/chat?session=abc-123');
  });

  it('encode les caractères spéciaux de l’identifiant', () => {
    expect(staffConsoleUrl('a/b c')).toContain('session=a%2Fb%20c');
  });
});

describe('buildNewConversationMessage', () => {
  it('inclut le nom du visiteur, le premier message et le lien de reprise', () => {
    const msg = buildNewConversationMessage({
      sessionId: 's1',
      visitorName: 'Camille',
      pageUrl: 'https://neo-domotique.fr/contact',
      firstMessage: 'Bonjour, je voudrais un devis pour ma maison.',
    });
    expect(msg).toContain('Camille');
    expect(msg).toContain('je voudrais un devis');
    expect(msg).toContain('Prendre la main');
    expect(msg).toContain('/backoffice/support/chat?session=s1');
    expect(msg).toContain('https://neo-domotique.fr/contact');
  });

  it('retombe sur "Un visiteur" si le nom est absent', () => {
    const msg = buildNewConversationMessage({
      sessionId: 's2',
      visitorName: null,
      firstMessage: 'Salut',
    });
    expect(msg).toContain('Un visiteur');
  });

  it('tronque un premier message très long', () => {
    const long = 'a'.repeat(500);
    const msg = buildNewConversationMessage({
      sessionId: 's3',
      firstMessage: long,
    });
    expect(msg).toContain('…');
    expect(msg.length).toBeLessThan(500);
  });

  it('omet la ligne page quand l’URL est absente', () => {
    const msg = buildNewConversationMessage({
      sessionId: 's4',
      firstMessage: 'Coucou',
    });
    expect(msg).not.toContain('**Page**');
  });
});
