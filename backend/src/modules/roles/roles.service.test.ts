import { describe, expect, it } from 'bun:test';
import {
  normalizeRoleName,
  normalizePermissionInput,
  diffUserRoles,
  RoleValidationError,
} from './roles.service';

describe('normalizeRoleName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeRoleName('  Support N1  ')).toBe('Support N1');
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(() => normalizeRoleName('')).toThrow(RoleValidationError);
    expect(() => normalizeRoleName('   ')).toThrow(RoleValidationError);
  });

  it('rejects a non-string input', () => {
    expect(() => normalizeRoleName(undefined)).toThrow(RoleValidationError);
    expect(() => normalizeRoleName(42)).toThrow(RoleValidationError);
  });

  it('rejects a name longer than 50 characters', () => {
    expect(() => normalizeRoleName('x'.repeat(51))).toThrow(RoleValidationError);
    expect(normalizeRoleName('x'.repeat(50))).toHaveLength(50);
  });
});

describe('normalizePermissionInput', () => {
  it('returns an empty list when nothing is checked', () => {
    expect(normalizePermissionInput(undefined)).toEqual([]);
    expect(normalizePermissionInput(null)).toEqual([]);
  });

  it('wraps a single checked value into a list', () => {
    expect(normalizePermissionInput('clients.manage')).toEqual(['clients.manage']);
  });

  it('keeps multiple checked values', () => {
    const result = normalizePermissionInput(['clients.manage', 'produits.manage']);
    expect(result).toContain('clients.manage');
    expect(result).toContain('produits.manage');
  });

  it('drops unknown permission keys', () => {
    expect(normalizePermissionInput(['clients.manage', 'bogus.key'])).toEqual(['clients.manage']);
  });

  it('ignores non-string entries', () => {
    expect(normalizePermissionInput(['clients.manage', 5, null])).toEqual(['clients.manage']);
  });
});

describe('diffUserRoles', () => {
  it('adds newly desired roles', () => {
    expect(diffUserRoles(['a'], ['a', 'b'])).toEqual({ toAdd: ['b'], toRemove: [] });
  });

  it('removes roles no longer desired', () => {
    expect(diffUserRoles(['a', 'b'], ['a'])).toEqual({ toAdd: [], toRemove: ['b'] });
  });

  it('handles simultaneous add and remove', () => {
    const { toAdd, toRemove } = diffUserRoles(['a', 'b'], ['b', 'c']);
    expect(toAdd).toEqual(['c']);
    expect(toRemove).toEqual(['a']);
  });

  it('is a no-op when the sets match', () => {
    expect(diffUserRoles(['a', 'b'], ['b', 'a'])).toEqual({ toAdd: [], toRemove: [] });
  });

  it('removes everything when the desired set is empty', () => {
    expect(diffUserRoles(['a', 'b'], [])).toEqual({ toAdd: [], toRemove: ['a', 'b'] });
  });
});
