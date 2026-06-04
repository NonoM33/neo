import { describe, expect, it } from 'bun:test';
import { generateTempPassword } from './chatbot.account';

describe('generateTempPassword', () => {
  it('génère un mot de passe de 20 caractères', () => {
    expect(generateTempPassword()).toHaveLength(20);
  });

  it('ne contient pas de caractères ambigus (0, O, 1, l, I)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTempPassword()).not.toMatch(/[0O1lI]/);
    }
  });

  it('produit des valeurs différentes à chaque appel', () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTempPassword()));
    expect(set.size).toBe(50);
  });
});
