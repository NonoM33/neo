import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Régression : la bulle chatbot et le bouton feedback étaient tous deux ancrés
// bottom:20px / right:20px. Le feedback ayant un z-index supérieur, il
// recouvrait entièrement la bulle chatbot → "je vois pas le chatbot".
// Les deux widgets sont servis ensemble sur le site vitrine : ils ne doivent
// jamais occuper la même ancre bas-droite.
function readWidget(name: string): string {
  return readFileSync(join(import.meta.dir, name), 'utf8');
}
const feedback = readFileSync(
  join(import.meta.dir, '../feedback/feedback-widget.js'),
  'utf8'
);
const chatbot = readWidget('chatbot-widget.js');

function anchor(css: string, selector: string): { bottom: string; right: string } {
  const block = css.match(
    new RegExp(selector + '\\{position:fixed;[^}]*\\}')
  )?.[0];
  if (!block) throw new Error(`Bloc CSS introuvable pour ${selector}`);
  const bottom = block.match(/bottom:([^;]+)/)?.[1] ?? '';
  const right = block.match(/right:([^;]+)/)?.[1] ?? '';
  return { bottom, right };
}

describe('chatbot-widget — pas de collision avec le feedback', () => {
  it('le chatbot et le feedback ne partagent pas la même ancre bas-droite', () => {
    const chat = anchor(chatbot, '#ncw');
    const fb = anchor(feedback, '#nf-root');
    expect(chat.bottom).toBe(fb.bottom); // alignés verticalement, c'est voulu
    expect(chat.right).not.toBe(fb.right); // mais décalés horizontalement
  });
});
