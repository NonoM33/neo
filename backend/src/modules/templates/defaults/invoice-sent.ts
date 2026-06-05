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
        <tr><td style="padding:34px 36px 26px;background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;">
          <div style="font-size:13px;letter-spacing:1px;opacity:.85;text-transform:uppercase;">{{company.name}}</div>
          <h1 style="margin:8px 0 0;font-size:25px;font-weight:800;">Votre facture {{invoice.number}}</h1>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px;font-size:16px;">Bonjour {{client.firstName}} {{client.lastName}},</p>
          <p style="margin:0 0 16px;">Veuillez trouver ci-joint votre facture <strong>{{invoice.number}}</strong> d’un montant de <strong>{{invoice.totalTTC}} TTC</strong>.</p>
          {{#if invoice.dueDate}}<p style="margin:0 0 16px;color:#475569;">Date limite de règlement : <strong style="color:#dc2626;">{{invoice.dueDate}}</strong>.</p>{{/if}}
          {{#if customMessage}}<div style="margin:0 0 24px;padding:16px 20px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:8px;color:#334155;font-style:italic;">{{customMessage}}</div>{{/if}}

          <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;border-radius:12px;margin:18px 0;">
            <tr>
              <td style="padding:16px 20px;">
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Facture</div>
                <div style="font-size:18px;font-weight:700;margin-top:4px;">{{invoice.number}}</div>
              </td>
              <td style="padding:16px 20px;text-align:right;">
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">À payer</div>
                <div style="font-size:18px;font-weight:800;margin-top:4px;color:#dc2626;">{{invoice.totalTTC}}</div>
              </td>
            </tr>
          </table>

          <p style="margin:16px 0 0;color:#475569;font-size:14px;">La facture détaillée est en pièce jointe au format PDF. Pour toute question, répondez simplement à cet email.</p>

          <p style="margin:30px 0 4px;color:#1e293b;">Cordialement,</p>
          <p style="margin:0;color:#1e293b;font-weight:700;">{{#if salesPersonName}}{{salesPersonName}}{{else}}L’équipe {{company.name}}{{/if}}</p>
          {{#if salesPersonName}}<p style="margin:0;color:#64748b;font-size:13px;">{{company.name}}</p>{{/if}}
        </td></tr>
        <tr><td style="padding:20px 36px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;">
          {{company.name}}{{#if company.address}} · {{company.address}}{{/if}}{{#if company.siret}}<br>SIRET {{company.siret}}{{/if}}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const invoiceSentTemplate: TemplateDefinition = {
  key: 'invoice-sent',
  kind: 'email',
  name: 'Email — Facture envoyée',
  description: 'Email accompagnant l’envoi d’une facture au client (PDF en pièce jointe).',
  subject: 'Votre facture {{invoice.number}} — {{company.name}}',
  html,
  variables: [
    { token: 'company.name', label: 'Nom société' },
    { token: 'company.address', label: 'Adresse société' },
    { token: 'company.siret', label: 'SIRET' },
    { token: 'client.firstName', label: 'Prénom client' },
    { token: 'client.lastName', label: 'Nom client' },
    { token: 'invoice.number', label: 'Numéro de facture' },
    { token: 'invoice.totalTTC', label: 'Total TTC' },
    { token: 'invoice.dueDate', label: 'Échéance' },
    { token: 'customMessage', label: 'Message personnalisé' },
    { token: 'salesPersonName', label: 'Nom du commercial' },
  ],
  sampleData: {
    company: { name: 'Neo Domotique', address: '12 rue des Lilas, 75011 Paris', siret: '000 000 000 00000' },
    client: { firstName: 'Marie', lastName: 'Dupont' },
    invoice: { number: 'FAC-2026-0042', totalTTC: '478,80 €', dueDate: '5 juillet 2026' },
    customMessage: '',
    salesPersonName: 'Renaud Cosson',
  },
};
