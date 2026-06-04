import { describe, expect, it } from 'bun:test';
import { validateCommentInput, formatAuthorName, COMMENT_MAX_LENGTH } from './comments.validate';

describe('validateCommentInput', () => {
  it('accepte un commentaire valide et trim le contenu', () => {
    const res = validateCommentInput({ entityType: 'client', entityId: 'c-1', content: '  Bonjour  ' });
    expect(res).toEqual({ ok: true, entityType: 'client', entityId: 'c-1', content: 'Bonjour' });
  });

  it('accepte les trois types d’entité', () => {
    for (const t of ['client', 'project', 'lead']) {
      expect(validateCommentInput({ entityType: t, entityId: 'x', content: 'ok' }).ok).toBe(true);
    }
  });

  it('rejette un type d’entité inconnu', () => {
    expect(validateCommentInput({ entityType: 'invoice', entityId: 'x', content: 'ok' })).toEqual({
      ok: false,
      status: 400,
      error: 'Type d’entité invalide',
    });
  });

  it('rejette un id manquant', () => {
    expect(validateCommentInput({ entityType: 'client', entityId: '  ', content: 'ok' })).toEqual({
      ok: false,
      status: 400,
      error: 'Entité manquante',
    });
  });

  it('rejette un contenu vide ou composé d’espaces', () => {
    expect(validateCommentInput({ entityType: 'client', entityId: 'x', content: '   ' })).toEqual({
      ok: false,
      status: 400,
      error: 'Le commentaire est vide',
    });
  });

  it('rejette un contenu trop long', () => {
    const long = 'a'.repeat(COMMENT_MAX_LENGTH + 1);
    expect(validateCommentInput({ entityType: 'client', entityId: 'x', content: long })).toEqual({
      ok: false,
      status: 400,
      error: 'Le commentaire est trop long',
    });
  });
});

describe('formatAuthorName', () => {
  it('combine prénom et nom', () => {
    expect(formatAuthorName('Jean', 'Dupont')).toBe('Jean Dupont');
  });

  it('retombe sur un libellé par défaut si vide', () => {
    expect(formatAuthorName('', '')).toBe('Utilisateur');
  });
});
