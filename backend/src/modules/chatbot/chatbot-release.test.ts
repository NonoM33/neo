import { describe, expect, it } from 'bun:test';
import { hasUnansweredVisitorMessages } from './chatbot.ws';

// Régression : quand un conseiller rend la main au bot et que le visiteur a
// écrit sans recevoir de réponse de notre part, le bot doit répondre. La
// décision repose sur le dernier message conversationnel (hors système).
describe('hasUnansweredVisitorMessages', () => {
  it("répond quand le dernier message est du visiteur", () => {
    expect(
      hasUnansweredVisitorMessages([
        { role: 'visitor' },
        { role: 'staff' },
        { role: 'visitor' },
      ])
    ).toBe(true);
  });

  it("ignore les messages système postérieurs à la question du visiteur", () => {
    expect(
      hasUnansweredVisitorMessages([
        { role: 'visitor' },
        { role: 'system' }, // "La conversation est de nouveau gérée par l'assistant."
      ])
    ).toBe(true);
  });

  it("ne répond pas si un conseiller a déjà répondu en dernier", () => {
    expect(
      hasUnansweredVisitorMessages([
        { role: 'visitor' },
        { role: 'staff' },
      ])
    ).toBe(false);
  });

  it("ne répond pas si le bot a déjà répondu en dernier", () => {
    expect(
      hasUnansweredVisitorMessages([
        { role: 'visitor' },
        { role: 'bot' },
      ])
    ).toBe(false);
  });

  it("ne répond pas sur une conversation vide ou uniquement système", () => {
    expect(hasUnansweredVisitorMessages([])).toBe(false);
    expect(hasUnansweredVisitorMessages([{ role: 'system' }])).toBe(false);
  });
});
