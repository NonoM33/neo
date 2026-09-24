import { describe, expect, it } from 'bun:test';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { JWTPayload } from '../../middleware/auth.middleware';
import { staffIdFromChatToken } from './chatbot.routes';

// Régression : la console de chat live a été portée dans l'app React, qui
// s'authentifie en JWT (et non plus via le cookie de session back-office). Le
// handshake WebSocket ne pouvant pas porter d'en-tête Authorization, le jeton
// staff transite en query `?token=...`. On vérifie ici la décision d'autorisation
// pure : un jeton valide avec la permission support (ou rôle admin) débloque la
// console, les autres sont rejetés.

const USER_ID = '11111111-1111-1111-1111-111111111111';

function token(payload: Partial<JWTPayload>): string {
  const full: JWTPayload = {
    userId: USER_ID,
    email: 'agent@example.com',
    role: 'commercial',
    roles: ['commercial'],
    permissions: [],
    ...payload,
  } as JWTPayload;
  return sign(full, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('staffIdFromChatToken — auth WebSocket console chat live', () => {
  it('autorise un jeton portant la permission support.manage', () => {
    const t = token({ permissions: ['support.manage'] });
    expect(staffIdFromChatToken(t)).toBe(USER_ID);
  });

  it('autorise un jeton de rôle admin même sans permission explicite', () => {
    const t = token({ role: 'admin', roles: ['admin'], permissions: [] });
    expect(staffIdFromChatToken(t)).toBe(USER_ID);
  });

  it('rejette un jeton sans la permission support', () => {
    const t = token({ permissions: ['leads.read'] });
    expect(staffIdFromChatToken(t)).toBeNull();
  });

  it('rejette un jeton signé avec un mauvais secret', () => {
    const forged = sign({ userId: USER_ID, permissions: ['support.manage'] }, 'mauvais-secret', {
      expiresIn: '1h',
    });
    expect(staffIdFromChatToken(forged)).toBeNull();
  });

  it('rejette une chaîne qui n\'est pas un JWT', () => {
    expect(staffIdFromChatToken('pas-un-jwt')).toBeNull();
  });
});
