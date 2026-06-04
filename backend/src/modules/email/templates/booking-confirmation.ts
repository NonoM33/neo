/**
 * HTML template for the "appointment booked via chatbot" confirmation email.
 * All CSS inlined for maximum email-client compatibility.
 */

import { env } from '../../../config/env';

export interface BookingConfirmationEmailVars {
  clientFirstName: string;
  /** Human-readable appointment type, e.g. "Visite technique". */
  typeLabel: string;
  /** Appointment date as YYYY-MM-DD. */
  date: string;
  /** Appointment start time as HH:MM. */
  startTime: string;
  /** Full address where the technician will go. */
  address: string;
  /** Name of the assigned advisor/technician. */
  assignedToName?: string;
  /** Public link to manage (reschedule/cancel) the appointment. */
  manageUrl?: string;
}

function fmtDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function renderBookingConfirmationEmail(v: BookingConfirmationEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const company = env.COMPANY_NAME;
  const dateLabel = fmtDate(v.date);
  const greeting = `Bonjour ${v.clientFirstName},`;
  const subject = `Confirmation de votre ${v.typeLabel.toLowerCase()} — ${company}`;

  const advisorLine = v.assignedToName
    ? `<tr><td style="padding: 6px 0; color: #64748b;">Votre conseiller</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${v.assignedToName}</td></tr>`
    : '';
  const ctaButton = v.manageUrl
    ? `<table cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;"><tr><td align="center" bgcolor="#198754" style="border-radius: 8px;"><a href="${v.manageUrl}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Gérer mon rendez-vous</a></td></tr></table>`
    : '';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);">
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #198754, #20c997); color: #ffffff;">
              <div style="font-size: 13px; letter-spacing: 1px; opacity: 0.85; text-transform: uppercase;">${company}</div>
              <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 700;">Votre rendez-vous est confirmé</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
              <p style="margin: 0 0 16px;">Nous avons bien enregistré votre <strong>${v.typeLabel}</strong>. Voici le récapitulatif :</p>

              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; margin: 16px 0; padding: 8px 20px;">
                <tr><td style="padding: 6px 0; color: #64748b;">Date</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${dateLabel}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Heure</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${v.startTime}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Adresse</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${v.address}</td></tr>
                ${advisorLine}
              </table>

              ${ctaButton}

              <p style="margin: 16px 0 0; color: #475569; font-size: 14px;">Un conseiller vous recontactera sous 24h pour confirmer. Pour toute question, répondez simplement à cet email.</p>

              <p style="margin: 32px 0 4px; color: #1e293b;">À très bientôt,</p>
              <p style="margin: 0; color: #1e293b; font-weight: 600;">L'équipe ${company}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background: #f8fafc; color: #64748b; font-size: 12px; text-align: center; border-top: 1px solid #e2e8f0;">
              Cet email vous a été envoyé par ${company}.
              ${env.COMPANY_ADDRESS ? `<br>${env.COMPANY_ADDRESS}` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Nous avons bien enregistré votre ${v.typeLabel}. Voici le récapitulatif :
- Date : ${dateLabel}
- Heure : ${v.startTime}
- Adresse : ${v.address}
${v.assignedToName ? `- Conseiller : ${v.assignedToName}\n` : ''}${v.manageUrl ? `\nGérer mon rendez-vous : ${v.manageUrl}\n` : ''}
Un conseiller vous recontactera sous 24h pour confirmer.

À très bientôt,
L'équipe ${company}`;

  return { subject, html, text };
}
