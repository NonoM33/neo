import { describe, expect, it } from 'bun:test';
import { extractPgCode, isAlreadyPresentError, pendingMigrations, splitStatements } from './migrate.lib';

describe('splitStatements', () => {
  it('découpe sur le séparateur drizzle-kit et ignore les blancs', () => {
    const file = `CREATE TABLE a (id int);\n--> statement-breakpoint\n\nALTER TABLE a ADD COLUMN b text;\n--> statement-breakpoint\n`;
    expect(splitStatements(file)).toEqual(['CREATE TABLE a (id int);', 'ALTER TABLE a ADD COLUMN b text;']);
  });
});

describe('isAlreadyPresentError', () => {
  it('reconnaît « type already exists » (régression prod : CREATE TYPE user_role)', () => {
    expect(isAlreadyPresentError({ code: '42710', message: 'type "user_role" already exists' })).toBe(true);
  });

  it('reconnaît l’erreur enveloppée par Drizzle (cause)', () => {
    const wrapped = { message: 'Failed query', cause: { code: '42P07', message: 'relation "users" already exists' } };
    expect(isAlreadyPresentError(wrapped)).toBe(true);
    expect(extractPgCode(wrapped)).toBe('42P07');
  });

  it('laisse remonter les vraies erreurs (colonne inconnue, syntaxe)', () => {
    expect(isAlreadyPresentError({ code: '42703' })).toBe(false);
    expect(isAlreadyPresentError({ code: '42601' })).toBe(false);
    expect(isAlreadyPresentError(new Error('boom'))).toBe(false);
  });
});

describe('pendingMigrations', () => {
  const journal = [
    { idx: 1, when: 200, tag: '0001_b' },
    { idx: 0, when: 100, tag: '0000_a' },
    { idx: 2, when: 300, tag: '0002_c' },
  ];

  it('rejoue tout sur une base sans journal', () => {
    expect(pendingMigrations(journal, []).map((m) => m.tag)).toEqual(['0000_a', '0001_b', '0002_c']);
  });

  it('ne garde que les migrations postérieures à la dernière enregistrée', () => {
    expect(pendingMigrations(journal, [{ hash: 'x', created_at: '200' }]).map((m) => m.tag)).toEqual(['0002_c']);
  });
});
