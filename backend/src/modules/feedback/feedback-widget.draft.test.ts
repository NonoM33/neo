import { describe, expect, it } from 'bun:test';

// On teste les fonctions de brouillon REELLEMENT servies au navigateur : on lit
// le widget et on extrait chaque fonction pure par comptage d'accolades, puis on
// l'evalue. Aucune duplication de logique avec la source.
const widgetSource = await Bun.file(
  import.meta.dir + '/feedback-widget.js'
).text();

function extractFn<T>(src: string, signature: string, name: string): T {
  const start = src.indexOf(signature);
  if (start === -1) throw new Error(`${name} introuvable dans le widget`);
  const braceStart = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const fnSource = src.slice(start, end);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(`${fnSource}; return ${name};`)() as T;
}

interface Draft {
  title?: string;
  desc?: string;
  steps?: string;
  exp?: string;
  at?: number;
}

const draftIsEmpty = extractFn<(d: Draft | null) => boolean>(
  widgetSource,
  'function draftIsEmpty(d)',
  'draftIsEmpty'
);
const draftIsFresh = extractFn<
  (d: Draft | null, now: number, ttl: number) => boolean
>(widgetSource, 'function draftIsFresh(d, now, ttl)', 'draftIsFresh');

describe('feedback-widget draftIsEmpty', () => {
  it('considere null/undefined comme vide', () => {
    expect(draftIsEmpty(null)).toBe(true);
  });

  it('considere des champs vides ou blancs comme vide', () => {
    expect(draftIsEmpty({ title: '', desc: '', steps: '', exp: '' })).toBe(true);
    expect(draftIsEmpty({ title: '   ', desc: '\n\t' })).toBe(true);
  });

  it('considere un brouillon avec du contenu comme NON vide', () => {
    // Regression : un retour en cours de saisie ne doit jamais etre jete.
    expect(draftIsEmpty({ title: 'Le bouton ne repond pas' })).toBe(false);
    expect(draftIsEmpty({ desc: 'Cliquer ne fait rien' })).toBe(false);
    expect(draftIsEmpty({ steps: '1. ...' })).toBe(false);
    expect(draftIsEmpty({ exp: 'Le devis devrait se sauvegarder' })).toBe(false);
  });
});

describe('feedback-widget draftIsFresh', () => {
  const now = 1_000_000_000_000;
  const ttl = 24 * 60 * 60 * 1000;

  it('restaure un brouillon recent (< TTL)', () => {
    // Regression : fermer/rouvrir la modale doit retrouver la saisie.
    expect(draftIsFresh({ at: now - 60_000 }, now, ttl)).toBe(true);
    expect(draftIsFresh({ at: now }, now, ttl)).toBe(true);
  });

  it('ignore un brouillon expire (> TTL)', () => {
    expect(draftIsFresh({ at: now - ttl - 1 }, now, ttl)).toBe(false);
  });

  it('ignore un brouillon sans horodatage ou nul', () => {
    expect(draftIsFresh({}, now, ttl)).toBe(false);
    expect(draftIsFresh(null, now, ttl)).toBe(false);
  });
});
