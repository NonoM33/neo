import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Régression : à l'envoi d'un message depuis la console staff, rien ne
// s'affichait tant que l'écho serveur n'était pas traité ("il faut renvoyer
// pour voir le message"). La console doit afficher le message en optimiste dès
// le submit, puis dédupliquer l'écho serveur par id pour éviter le doublon.
const source = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8');

describe('console Chat live — rendu du message staff', () => {
  it('affiche le message du conseiller en optimiste dès le submit', () => {
    expect(source).toContain('function appendOptimisticStaff');
    // L'appel optimiste doit précéder l'envoi WebSocket dans le handler submit.
    const optimistic = source.indexOf('appendOptimisticStaff(txt)');
    const send = source.indexOf("sendAction({type:'message'");
    expect(optimistic).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(-1);
    expect(optimistic).toBeLessThan(send);
  });

  it("déduplique l'écho serveur par id et confirme le message optimiste", () => {
    expect(source).toContain('seen[m.id]');
    expect(source).toContain('data-pending');
  });
});

// Indicateur de saisie + bouton "Corriger" : quand le visiteur écrit, la console
// doit afficher des points animés ; quand le conseiller écrit, prévenir le
// visiteur ; et un bouton doit corriger l'orthographe du brouillon via le LLM.
describe('console Chat live — indicateur de saisie & correction', () => {
  it('affiche les points animés quand le visiteur écrit', () => {
    expect(source).toContain("d.type==='visitor_typing'");
    expect(source).toContain('function showTyping');
    expect(source).toContain('chat-dots');
  });

  it('masque les points dès qu’un message arrive', () => {
    expect(source).toContain('function hideTyping');
    expect(source).toContain("hideTyping(); appendMsg(d.message)");
  });

  it('prévient le visiteur quand le conseiller écrit (throttle)', () => {
    expect(source).toContain('function sendStaffTyping');
    expect(source).toContain("sendAction({type:'typing'");
    expect(source).toContain("addEventListener('input', sendStaffTyping)");
  });

  it('expose un bouton de correction câblé au LLM', () => {
    expect(source).toContain('id="chat-correct"');
    expect(source).toContain('function requestCorrection');
    expect(source).toContain("sendAction({type:'correct'");
    // La réponse de correction réinjecte le texte corrigé dans le champ.
    expect(source).toContain("d.type==='correction'");
    expect(source).toContain('function applyCorrection');
  });
});

// Régression : "les bulles quand on envoie, c'est comme si c'était le client".
// Chaque bulle doit porter un libellé d'émetteur (Conseiller / Assistant /
// visiteur) et, dès qu'un conseiller prend la main, un bandeau explicite doit
// l'indiquer dans la console.
describe('console Chat live — attribution & prise en main', () => {
  it('garde le visiteur à gauche et conseiller/bot à droite', () => {
    expect(source).toContain('.cm-row.visitor { align-self:flex-start');
    expect(source).toContain('.cm-row.bot, .cm-row.staff { align-self:flex-end');
  });

  it('affiche un libellé émetteur au-dessus de chaque bulle', () => {
    expect(source).toContain('function metaFor');
    expect(source).toContain('Conseiller');
    expect(source).toContain('Assistant');
    expect(source).toContain('cm-meta');
  });

  it('affiche un bandeau quand un conseiller a pris la main', () => {
    expect(source).toContain('chat-takeover');
    expect(source).toContain('Un conseiller a pris la main');
    expect(source).toContain("s.mode==='human'");
  });
});
