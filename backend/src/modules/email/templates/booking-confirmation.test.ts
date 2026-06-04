import { describe, expect, it } from 'bun:test';
import { renderBookingConfirmationEmail } from './booking-confirmation';

const base = {
  clientFirstName: 'Camille',
  typeLabel: 'Visite technique',
  date: '2026-06-15',
  startTime: '14:30',
  address: '12 rue des Lilas, 75011 Paris',
};

describe('renderBookingConfirmationEmail', () => {
  it('génère un sujet, un HTML et un texte', () => {
    const mail = renderBookingConfirmationEmail(base);
    expect(mail.subject).toContain('visite technique');
    expect(mail.html).toContain('<!doctype html>');
    expect(mail.text.length).toBeGreaterThan(0);
  });

  it('intègre le prénom, le créneau et l’adresse dans le corps', () => {
    const mail = renderBookingConfirmationEmail(base);
    expect(mail.html).toContain('Camille');
    expect(mail.html).toContain('14:30');
    expect(mail.html).toContain('12 rue des Lilas, 75011 Paris');
    expect(mail.text).toContain('Camille');
    expect(mail.text).toContain('14:30');
  });

  it('formate la date en français', () => {
    const mail = renderBookingConfirmationEmail(base);
    // 15 juin 2026 est un lundi
    expect(mail.html).toContain('lundi 15 juin 2026');
  });

  it('affiche le conseiller quand il est fourni', () => {
    const mail = renderBookingConfirmationEmail({
      ...base,
      assignedToName: 'Léa Martin',
    });
    expect(mail.html).toContain('Léa Martin');
    expect(mail.text).toContain('Léa Martin');
  });

  it('omet la ligne conseiller quand il est absent', () => {
    const mail = renderBookingConfirmationEmail(base);
    expect(mail.html).not.toContain('Votre conseiller');
  });

  it('affiche le bouton de gestion quand un lien est fourni', () => {
    const mail = renderBookingConfirmationEmail({
      ...base,
      manageUrl: 'https://neo-domotique.fr/rdv?t=abc123',
    });
    expect(mail.html).toContain('https://neo-domotique.fr/rdv?t=abc123');
    expect(mail.html).toContain('Gérer mon rendez-vous');
    expect(mail.text).toContain('https://neo-domotique.fr/rdv?t=abc123');
  });

  it('omet le bouton de gestion sans lien', () => {
    const mail = renderBookingConfirmationEmail(base);
    expect(mail.html).not.toContain('Gérer mon rendez-vous');
  });
});
