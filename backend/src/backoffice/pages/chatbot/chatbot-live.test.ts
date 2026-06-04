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
