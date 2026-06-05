import { describe, expect, it } from 'bun:test';
import { PERMISSION_KEYS } from '../roles/permissions';
import {
  TOKEN_PREFIX,
  generateRawToken,
  hashToken,
  hashesEqual,
  isApiTokenFormat,
  resolveTokenAccess,
  tokenDisplayPrefix,
  type TokenRoleRow,
} from './system-tokens.service';

describe('generateRawToken', () => {
  it('produit un jeton préfixé de 48 caractères hexadécimaux', () => {
    const raw = generateRawToken();
    expect(raw.startsWith(TOKEN_PREFIX)).toBe(true);
    const body = raw.slice(TOKEN_PREFIX.length);
    expect(body).toMatch(/^[0-9a-f]{48}$/);
  });

  it('génère des jetons distincts à chaque appel', () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });
});

describe('hashToken', () => {
  it('est déterministe pour une même entrée', () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it('renvoie une empreinte SHA-256 hex (64 caractères)', () => {
    expect(hashToken('neo_sk_abc')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('change dès que l’entrée change', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

describe('isApiTokenFormat', () => {
  it('accepte un jeton fraîchement généré', () => {
    expect(isApiTokenFormat(generateRawToken())).toBe(true);
  });

  it('rejette un jeton sans préfixe', () => {
    expect(isApiTokenFormat('x'.repeat(TOKEN_PREFIX.length + 48))).toBe(false);
  });

  it('rejette un jeton de mauvaise longueur', () => {
    expect(isApiTokenFormat(TOKEN_PREFIX + 'abcd')).toBe(false);
  });

  it('rejette un JWT classique', () => {
    expect(isApiTokenFormat('eyJhbGciOi.payload.sig')).toBe(false);
  });
});

describe('tokenDisplayPrefix', () => {
  it('expose le préfixe plus 8 caractères, jamais le secret entier', () => {
    const raw = generateRawToken();
    const prefix = tokenDisplayPrefix(raw);
    expect(prefix.length).toBe(TOKEN_PREFIX.length + 8);
    expect(raw.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(raw.length);
  });
});

describe('hashesEqual', () => {
  it('vrai pour deux empreintes identiques', () => {
    const h = hashToken('neo_sk_xyz');
    expect(hashesEqual(h, h)).toBe(true);
  });

  it('faux pour des empreintes différentes', () => {
    expect(hashesEqual(hashToken('a'), hashToken('b'))).toBe(false);
  });

  it('faux pour des longueurs différentes (sans lever)', () => {
    expect(hashesEqual('abc', 'abcd')).toBe(false);
  });
});

describe('resolveTokenAccess', () => {
  it('rôle admin → super-admin avec toutes les permissions', () => {
    const rows: TokenRoleRow[] = [{ name: 'admin', permissions: [] }];
    const access = resolveTokenAccess(rows);
    expect(access.isSuperAdmin).toBe(true);
    expect(access.permissions).toEqual([...PERMISSION_KEYS]);
    expect(access.primaryRole).toBe('admin');
    expect(access.roleNames).toEqual(['admin']);
  });

  it('rôles non-admin → union des permissions cochées', () => {
    const rows: TokenRoleRow[] = [
      { name: 'commercial', permissions: ['crm.manage'] },
      { name: 'auditeur', permissions: ['support.manage', 'crm.manage'] },
    ];
    const access = resolveTokenAccess(rows);
    expect(access.isSuperAdmin).toBe(false);
    expect(access.permissions).toContain('crm.manage');
    expect(access.permissions).toContain('support.manage');
    // dédupliqué
    expect(access.permissions.filter((p) => p === 'crm.manage')).toHaveLength(1);
    expect(access.primaryRole).toBe('commercial');
  });

  it('aucun rôle → aucune permission, rôle par défaut auditeur', () => {
    const access = resolveTokenAccess([]);
    expect(access.isSuperAdmin).toBe(false);
    expect(access.permissions).toEqual([]);
    expect(access.roleNames).toEqual([]);
    expect(access.primaryRole).toBe('auditeur');
  });

  it('rôle custom non builtin → primaryRole retombe sur auditeur', () => {
    const rows: TokenRoleRow[] = [{ name: 'logistique', permissions: ['stock.manage'] }];
    const access = resolveTokenAccess(rows);
    expect(access.primaryRole).toBe('auditeur');
    expect(access.roleNames).toEqual(['logistique']);
  });
});
