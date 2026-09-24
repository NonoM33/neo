import { describe, expect, it } from 'bun:test';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema';

describe('createSupplierSchema', () => {
  it('accepte un fournisseur minimal et applique isActive=true par défaut', () => {
    const result = createSupplierSchema.parse({ name: 'ACME' });
    expect(result.name).toBe('ACME');
    expect(result.isActive).toBe(true);
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });

  it('rejette un nom vide', () => {
    expect(() => createSupplierSchema.parse({ name: '   ' })).toThrow();
  });

  it('normalise les chaînes vides en null', () => {
    const result = createSupplierSchema.parse({
      name: 'ACME',
      email: '',
      phone: '',
      city: '',
      notes: '',
    });
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.city).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('accepte un email valide et le conserve', () => {
    const result = createSupplierSchema.parse({ name: 'ACME', email: 'contact@acme.fr' });
    expect(result.email).toBe('contact@acme.fr');
  });

  it('rejette un email invalide non vide', () => {
    expect(() => createSupplierSchema.parse({ name: 'ACME', email: 'pas-un-email' })).toThrow();
  });

  it('rejette un delai de livraison negatif', () => {
    expect(() =>
      createSupplierSchema.parse({ name: 'ACME', deliveryLeadDays: -1 })
    ).toThrow();
  });

  it('accepte un delai de livraison valide', () => {
    const result = createSupplierSchema.parse({ name: 'ACME', deliveryLeadDays: 14 });
    expect(result.deliveryLeadDays).toBe(14);
  });
});

describe('updateSupplierSchema', () => {
  it('autorise une mise à jour partielle', () => {
    const result = updateSupplierSchema.parse({ phone: '0102030405' });
    expect(result.phone).toBe('0102030405');
    expect(result.name).toBeUndefined();
  });

  it('valide quand même un email fourni invalide', () => {
    expect(() => updateSupplierSchema.parse({ email: 'nope' })).toThrow();
  });
});
