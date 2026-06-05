import type { TemplateDefinition } from '../types';

const html = String.raw`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
        <tr><td style="padding:34px 36px 26px;background:linear-gradient(135deg,#198754,#20c997);color:#ffffff;">
          <div style="font-size:13px;letter-spacing:1px;opacity:.85;text-transform:uppercase;">{{company.name}}</div>
          <h1 style="margin:8px 0 0;font-size:25px;font-weight:800;">Rendez-vous confirmé ✅</h1>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px;font-size:16px;">Bonjour {{booking.clientFirstName}},</p>
          <p style="margin:0 0 16px;">Nous avons bien enregistré votre <strong>{{booking.typeLabel}}</strong>. Voici le récapitulatif :</p>

          <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;border-radius:12px;margin:16px 0;padding:8px 20px;">
            <tr><td style="padding:7px 0;color:#64748b;">Date</td><td style="padding:7px 0;text-align:right;font-weight:700;">{{booking.dateLabel}}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Heure</td><td style="padding:7px 0;text-align:right;font-weight:700;">{{booking.startTime}}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Adresse</td><td style="padding:7px 0;text-align:right;font-weight:700;">{{booking.address}}</td></tr>
            {{#if booking.assignedToName}}<tr><td style="padding:7px 0;color:#64748b;">Votre conseiller</td><td style="padding:7px 0;text-align:right;font-weight:700;">{{booking.assignedToName}}</td></tr>{{/if}}
          </table>

          {{#if booking.manageUrl}}
          <table cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr>
            <td align="center" bgcolor="#198754" style="border-radius:10px;">
              <a href="{{booking.manageUrl}}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Gérer mon rendez-vous</a>
            </td>
          </tr></table>
          {{/if}}

          <p style="margin:16px 0 0;color:#475569;font-size:14px;">Un conseiller vous recontactera sous 24h pour confirmer. Pour toute question, répondez simplement à cet email.</p>

          <p style="margin:30px 0 4px;color:#1e293b;">À très bientôt,</p>
          <p style="margin:0;color:#1e293b;font-weight:700;">L’équipe {{company.name}}</p>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;">
          {{company.name}}{{#if company.address}} · {{company.address}}{{/if}}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const bookingConfirmationTemplate: TemplateDefinition = {
  key: 'booking-confirmation',
  kind: 'email',
  name: 'Email — Confirmation de RDV',
  description: 'Email de confirmation envoyé après une prise de rendez-vous.',
  subject: 'Confirmation de votre {{booking.typeLabel}} — {{company.name}}',
  html,
  variables: [
    { token: 'company.name', label: 'Nom société' },
    { token: 'company.address', label: 'Adresse société' },
    { token: 'booking.clientFirstName', label: 'Prénom client' },
    { token: 'booking.typeLabel', label: 'Type de RDV' },
    { token: 'booking.dateLabel', label: 'Date (formatée)' },
    { token: 'booking.startTime', label: 'Heure' },
    { token: 'booking.address', label: 'Adresse' },
    { token: 'booking.assignedToName', label: 'Conseiller assigné' },
    { token: 'booking.manageUrl', label: 'Lien de gestion' },
  ],
  sampleData: {
    company: { name: 'Neo Domotique', address: '12 rue des Lilas, 75011 Paris' },
    booking: {
      clientFirstName: 'Marie',
      typeLabel: 'Visite technique',
      dateLabel: 'lundi 15 juin 2026',
      startTime: '14:30',
      address: '8 avenue Victor Hugo, 69002 Lyon',
      assignedToName: 'Renaud Cosson',
      manageUrl: 'https://neo-domotique.fr/rdv/gerer',
    },
  },
};
