import { describe, expect, it } from 'bun:test';
import { renderAccountWelcomeEmail } from './account-welcome';

const base = {
  clientFirstName: 'Camille',
  email: 'camille@example.com',
  tempPassword: 'Xk7mPq2RtW9vBn4sLh6Z',
  loginUrl: 'https://neo-domotique.fr/espace-client',
};

describe('renderAccountWelcomeEmail', () => {
  it('génère un sujet, un HTML et un texte', () => {
    const mail = renderAccountWelcomeEmail(base);
    expect(mail.subject.toLowerCase()).toContain('espace client');
    expect(mail.html).toContain('<!doctype html>');
    expect(mail.text.length).toBeGreaterThan(0);
  });

  it('intègre le prénom, l’email et le mot de passe provisoire', () => {
    const mail = renderAccountWelcomeEmail(base);
    expect(mail.html).toContain('Camille');
    expect(mail.html).toContain('camille@example.com');
    expect(mail.html).toContain('Xk7mPq2RtW9vBn4sLh6Z');
    expect(mail.text).toContain('Xk7mPq2RtW9vBn4sLh6Z');
  });

  it('intègre le lien de connexion au portail', () => {
    const mail = renderAccountWelcomeEmail(base);
    expect(mail.html).toContain('https://neo-domotique.fr/espace-client');
    expect(mail.html).toContain('Accéder à mon espace');
    expect(mail.text).toContain('https://neo-domotique.fr/espace-client');
  });

  it('invite à changer le mot de passe provisoire', () => {
    const mail = renderAccountWelcomeEmail(base);
    expect(mail.html.toLowerCase()).toContain('modifier ce mot de passe');
  });
});
