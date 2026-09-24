import { describe, expect, it } from 'bun:test';
import app from '../../app';

// Regression : l'application COMPLETE (pas seulement le routeur) doit laisser
// passer l'annonce d'une box. Le premier boot du simulateur a echoue en 401
// parce que /api/boxes etait monte apres des routeurs /api a middleware
// catch-all (rooms, photos, floor-plans...) qui exigent un utilisateur.
describe('app — /api/boxes/announce', () => {
  it('atteint la validation (400 sur corps invalide) au lieu de 401', async () => {
    const res = await app.request('/api/boxes/announce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nope: true }),
    });
    expect(res.status).toBe(400);
  });
});
