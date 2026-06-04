import { describe, expect, it } from 'bun:test';
import {
  buildFeatureValidationUpdate,
  isFeedbackEditableByReporter,
} from './recette.service';

describe('buildFeatureValidationUpdate', () => {
  const now = new Date('2026-06-03T10:00:00Z');

  it('renseigne validatedBy/validatedAt quand la feature est validee', () => {
    const update = buildFeatureValidationUpdate('valide', 'Jean Dupont', now);
    expect(update.validationStatus).toBe('valide');
    expect(update.validatedBy).toBe('Jean Dupont');
    expect(update.validatedAt).toEqual(now);
    expect(update.updatedAt).toEqual(now);
  });

  it('renseigne validatedBy/validatedAt quand la feature est a corriger', () => {
    const update = buildFeatureValidationUpdate('a_corriger', 'Jean Dupont', now);
    expect(update.validationStatus).toBe('a_corriger');
    expect(update.validatedBy).toBe('Jean Dupont');
    expect(update.validatedAt).toEqual(now);
  });

  it('efface validatedBy/validatedAt lors d un reset a a_tester', () => {
    const update = buildFeatureValidationUpdate('a_tester', 'Jean Dupont', now);
    expect(update.validationStatus).toBe('a_tester');
    expect(update.validatedBy).toBeNull();
    expect(update.validatedAt).toBeNull();
    expect(update.updatedAt).toEqual(now);
  });
});

describe('isFeedbackEditableByReporter', () => {
  it('autorise l edition tant que le retour est "ouvert" (pas en traitement)', () => {
    expect(isFeedbackEditableByReporter('ouvert')).toBe(true);
  });

  it('verrouille l edition des que le retour est pris en charge', () => {
    // Regression : un retour corrige/valide/a revoir n'est plus modifiable par
    // son rapporteur (l'equipe a commence a le traiter).
    expect(isFeedbackEditableByReporter('corrige')).toBe(false);
    expect(isFeedbackEditableByReporter('valide')).toBe(false);
    expect(isFeedbackEditableByReporter('a_revoir')).toBe(false);
  });
});
