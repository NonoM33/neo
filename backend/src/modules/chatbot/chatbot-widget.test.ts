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

// Régression : côté visiteur, les messages du visiteur (client) sortent à
// DROITE et ceux d'un conseiller/bot à GAUCHE. Si la bulle staff sortait à
// droite, "on aurait l'impression que c'est le client qui envoie". De plus,
// quand un conseiller prend la main, ses messages doivent être étiquetés.
describe('chatbot-widget — attribution des bulles', () => {
  it('place le visiteur à droite et le conseiller/bot à gauche', () => {
    expect(chatbot).toContain('.ncw-m.visitor{align-self:flex-end');
    expect(chatbot).toContain('.ncw-m.staff{align-self:flex-start');
    expect(chatbot).toContain('.ncw-m.bot{align-self:flex-start');
  });

  it('étiquette les messages du conseiller (prise en main visible)', () => {
    expect(chatbot).toContain('.ncw-meta{');
    expect(chatbot).toContain('Conseiller');
    // Le libellé n'est ajouté que pour un message staff non consécutif.
    expect(chatbot).toContain("role === 'staff' && lastRenderedRole !== 'staff'");
  });
});

// Régression : "on peut pas scroller en tant que client". La zone des messages
// est un enfant flex (flex:1) dans un panneau à hauteur fixe (height:520px,
// overflow:hidden). Sans `min-height:0`, l'enfant flex refuse de rétrécir sous
// la taille de son contenu : il déborde et masque le haut au lieu de scroller.
describe('chatbot-widget — scroll de la zone messages', () => {
  it('#ncw-msgs autorise le rétrécissement flex (min-height:0) pour scroller', () => {
    const block = chatbot.match(/#ncw-msgs\{[^}]*\}/)?.[0] ?? '';
    expect(block).toContain('overflow-y:auto');
    expect(block).toContain('min-height:0');
  });
});

// Régression : "les messages envoyés disparaissent". À la (re)connexion, le
// handler `session` faisait `msgsEl.innerHTML = ''`, ce qui effaçait les bulles
// optimistes (messages tout juste envoyés, pas encore confirmés par le serveur).
// On rend désormais l'historique de façon idempotente (par id), sans vider le
// DOM, et on réconcilie les bulles en attente via l'écho serveur.
describe('chatbot-widget — fiabilité des messages visiteur', () => {
  it("ne vide jamais la zone messages en bloc (plus de innerHTML = '')", () => {
    expect(chatbot).not.toContain("msgsEl.innerHTML = ''");
    expect(chatbot).not.toContain("msgsEl.innerHTML=''");
  });

  it('rend l’historique de façon idempotente (dédup par id via seenIds)', () => {
    expect(chatbot).toContain('if (seenIds[m.id]) return');
  });

  it('conserve les bulles optimistes en attente (data-pending + réconciliation)', () => {
    expect(chatbot).toContain("'data-pending'");
    expect(chatbot).toContain('pending.push(item)');
    // La réconciliation se fait par contenu sur les messages visiteur.
    expect(chatbot).toContain("if (m.role === 'visitor')");
  });

  it('garantit qu’un message n’est jamais envoyé deux fois (flag sent)', () => {
    expect(chatbot).toContain('if (item.sent) return');
    expect(chatbot).toContain('item.sent = true');
  });

  it('se reconnecte automatiquement tant que la conversation est ouverte', () => {
    expect(chatbot).toContain('function scheduleReconnect()');
    expect(chatbot).toContain('if (sessionClosed || !opened) return');
  });
});

// Régression côté serveur indirecte : le widget doit pouvoir réconcilier sa
// bulle optimiste, ce qui suppose que le serveur lui renvoie son propre message
// (écho) — sans quoi la bulle resterait éternellement "en attente".
describe('chatbot.ws — écho du message visiteur', () => {
  it('renvoie le message du visiteur à ses propres connexions', () => {
    const ws = readFileSync(join(import.meta.dir, 'chatbot.ws.ts'), 'utf8');
    expect(ws).toContain(
      "sendToVisitors(sessionId, { type: 'message', message: serializeMessage(visitorMsg) })"
    );
  });
});
