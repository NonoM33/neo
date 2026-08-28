import { describe, expect, it } from 'bun:test';
import { CALL_US_SENTENCE, CONTACT_PHONE, CONTACT_PHONE_HREF } from './contact';

describe('coordonnées de contact', () => {
  it('expose le numéro commercial courant', () => {
    expect(CONTACT_PHONE).toBe('07 78 57 18 19');
  });

  it('dérive le lien tel: du numéro affiché', () => {
    const digits = CONTACT_PHONE.replace(/\s/g, '');
    expect(digits).toMatch(/^0[1-9]\d{8}$/);
    expect(CONTACT_PHONE_HREF).toBe(`tel:+33${digits.slice(1)}`);
  });

  it('invite à appeler ce numéro', () => {
    expect(CALL_US_SENTENCE).toContain(CONTACT_PHONE);
  });
});
