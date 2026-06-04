import { describe, expect, it } from 'bun:test';
import { validatePipelineMove } from './pipeline.move';

describe('validatePipelineMove', () => {
  it('accepte un déplacement de lead vers une étape de lead valide', () => {
    const res = validatePipelineMove({ type: 'lead', id: 'lead-1', status: 'qualifie' });
    expect(res).toEqual({ ok: true, type: 'lead', id: 'lead-1', status: 'qualifie' });
  });

  it('accepte un déplacement de projet vers une étape de projet valide', () => {
    const res = validatePipelineMove({ type: 'project', id: 'proj-1', status: 'en_cours' });
    expect(res).toEqual({ ok: true, type: 'project', id: 'proj-1', status: 'en_cours' });
  });

  it('rejette un lead déposé sur une colonne projet (statut hors enum lead)', () => {
    const res = validatePipelineMove({ type: 'lead', id: 'lead-1', status: 'en_cours' });
    expect(res).toEqual({ ok: false, status: 400, error: 'Statut de lead invalide' });
  });

  it('rejette un projet déposé sur une colonne lead (statut hors enum projet)', () => {
    const res = validatePipelineMove({ type: 'project', id: 'proj-1', status: 'prospect' });
    expect(res).toEqual({ ok: false, status: 400, error: 'Statut de projet invalide' });
  });

  it('rejette les étapes lead spéciales gagne/perdu via drag', () => {
    expect(validatePipelineMove({ type: 'lead', id: 'l', status: 'gagne' }).ok).toBe(false);
    expect(validatePipelineMove({ type: 'lead', id: 'l', status: 'perdu' }).ok).toBe(false);
  });

  it('rejette le statut projet archive via drag', () => {
    expect(validatePipelineMove({ type: 'project', id: 'p', status: 'archive' }).ok).toBe(false);
  });

  it('rejette un type inconnu', () => {
    const res = validatePipelineMove({ type: 'client', id: 'x', status: 'qualifie' });
    expect(res).toEqual({ ok: false, status: 400, error: 'Type invalide' });
  });

  it('rejette les paramètres manquants', () => {
    expect(validatePipelineMove({ type: 'lead', status: 'qualifie' })).toEqual({
      ok: false,
      status: 400,
      error: 'Paramètres manquants',
    });
    expect(validatePipelineMove({ type: 'lead', id: 'l' })).toEqual({
      ok: false,
      status: 400,
      error: 'Paramètres manquants',
    });
  });
});
