import { describe, expect, it } from 'bun:test';

// On teste la fonction resolveConfig REELLEMENT servie au navigateur : on lit
// le fichier widget et on en extrait la fonction par comptage d'accolades, puis
// on l'evalue avec un faux `document`. Aucune duplication de logique.
const widgetSource = await Bun.file(
  import.meta.dir + '/feedback-widget.js'
).text();

function extractResolveConfig(src: string): (doc: unknown) => {
  app: string;
  api: string;
  email: string;
} {
  const start = src.indexOf('function resolveConfig(doc)');
  if (start === -1) throw new Error('resolveConfig introuvable dans le widget');
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
  return new Function(`${fnSource}; return resolveConfig;`)() as never;
}

const resolveConfig = extractResolveConfig(widgetSource);

function fakeScript(attrs: Record<string, string>, src?: string) {
  return {
    src: src ?? '',
    getAttribute: (k: string) => attrs[k] ?? null,
  };
}

describe('feedback-widget resolveConfig', () => {
  it('lit data-app/data-api depuis currentScript (cas backoffice inline)', () => {
    const script = fakeScript(
      { 'data-app': 'admin', 'data-api': 'http://api.test' },
      'http://api.test/feedback-widget.js'
    );
    const cfg = resolveConfig({
      currentScript: script,
      getElementsByTagName: () => [script],
    });
    expect(cfg.app).toBe('admin');
    expect(cfg.api).toBe('http://api.test');
  });

  it('retrouve le script par son src quand currentScript est null (cas CRM injecte)', () => {
    // Regression : injection dynamique => document.currentScript === null.
    const script = fakeScript(
      { 'data-app': 'crm', 'data-api': 'http://api.test' },
      'http://api.test/feedback-widget.js'
    );
    const cfg = resolveConfig({
      currentScript: null,
      getElementsByTagName: () => [
        fakeScript({}, 'https://cdn.example/react.js'),
        script,
      ],
    });
    expect(cfg.app).toBe('crm');
    expect(cfg.api).toBe('http://api.test');
  });

  it('deduit l API depuis l origine du src quand data-api est absent (cas site defer)', () => {
    const script = fakeScript(
      { 'data-app': 'site' },
      'http://neo-api.example/feedback-widget.js'
    );
    const cfg = resolveConfig({
      currentScript: null,
      getElementsByTagName: () => [script],
    });
    expect(cfg.app).toBe('site');
    expect(cfg.api).toBe('http://neo-api.example');
  });
});
