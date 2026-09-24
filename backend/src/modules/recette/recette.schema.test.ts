import { describe, it, expect } from 'bun:test';
import {
  recetteFilterSchema,
  createFeedbackSchema,
  updateFeedbackStatusSchema,
  updateFeatureValidationSchema,
} from './recette.schema';

describe('recetteFilterSchema', () => {
  it('accepts an empty filter', () => {
    const result = recetteFilterSchema.parse({});
    expect(result.app).toBeUndefined();
    expect(result.status).toBeUndefined();
  });

  it('treats empty strings as no filter', () => {
    const result = recetteFilterSchema.parse({ app: '', status: '', severity: '', validation: '' });
    expect(result.app).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.severity).toBeUndefined();
    expect(result.validation).toBeUndefined();
  });

  it('keeps valid enum values', () => {
    const result = recetteFilterSchema.parse({ app: 'crm', status: 'ouvert', severity: 'bloquant', validation: 'valide' });
    expect(result.app).toBe('crm');
    expect(result.status).toBe('ouvert');
    expect(result.severity).toBe('bloquant');
    expect(result.validation).toBe('valide');
  });

  it('rejects an invalid app', () => {
    expect(() => recetteFilterSchema.parse({ app: 'mainframe' })).toThrow();
  });
});

describe('createFeedbackSchema', () => {
  const base = {
    featureId: '11111111-1111-4111-8111-111111111111',
    title: 'Bouton cassé',
    severity: 'majeur',
  };

  it('accepts a minimal valid feedback', () => {
    const result = createFeedbackSchema.parse(base);
    expect(result.title).toBe('Bouton cassé');
    expect(result.severity).toBe('majeur');
  });

  it('rejects an empty title', () => {
    expect(() => createFeedbackSchema.parse({ ...base, title: '   ' })).toThrow();
  });

  it('rejects a non-uuid featureId', () => {
    expect(() => createFeedbackSchema.parse({ ...base, featureId: 'nope' })).toThrow();
  });

  it('rejects an invalid severity', () => {
    expect(() => createFeedbackSchema.parse({ ...base, severity: 'catastrophique' })).toThrow();
  });
});

describe('updateFeedbackStatusSchema', () => {
  it('accepts a valid status', () => {
    expect(updateFeedbackStatusSchema.parse({ status: 'valide' }).status).toBe('valide');
  });

  it('rejects an invalid status', () => {
    expect(() => updateFeedbackStatusSchema.parse({ status: 'parti' })).toThrow();
  });
});

describe('updateFeatureValidationSchema', () => {
  it('accepts a valid validation status', () => {
    expect(updateFeatureValidationSchema.parse({ validationStatus: 'a_corriger' }).validationStatus).toBe('a_corriger');
  });

  it('rejects an invalid validation status', () => {
    expect(() => updateFeatureValidationSchema.parse({ validationStatus: 'peut_etre' })).toThrow();
  });
});
