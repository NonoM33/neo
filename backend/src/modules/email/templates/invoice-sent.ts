/**
 * HTML template for the "your invoice is ready" email.
 * Same visual idiom as quote-sent.ts but with a red-accented "À PAYER"
 * total and an optional due-date callout.
 */

import { env } from '../../../config/env';

export interface InvoiceSentEmailVars {
  clientFirstName: string;
  clientLastName: string;
  invoiceNumber: string;
  totalTTC: number;
  dueDate?: Date | null;
  customMessage?: string;
  salesPersonName?: string;
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function renderInvoiceSentEmail(v: InvoiceSentEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const company = env.COMPANY_NAME;
  const greeting = `Bonjour ${v.clientFirstName} ${v.clientLastName},`;
  const dueLine = v.dueDate
    ? `<p style="margin: 0 0 16px; color: #dc2626; font-weight: 600;">Échéance : ${fmtDate(v.dueDate)}.</p>`
    : '';
  const messageLine = v.customMessage
    ? `<div style="margin: 0 0 24px; padding: 16px 20px; background: #f8fafc; border-left: 3px solid #6366f1; border-radius: 4px; color: #334155; font-style: italic;">${v.customMessage}</div>`
    : '';
  const sig = v.salesPersonName
    ? `<p style="margin: 32px 0 4px; color: #1e293b;">Cordialement,</p><p style="margin: 0; color: #1e293b; font-weight: 600;">${v.salesPersonName}</p><p style="margin: 0; color: #64748b; font-size: 13px;">${company}</p>`
    : `<p style="margin: 32px 0 4px; color: #1e293b;">Cordialement,</p><p style="margin: 0; color: #1e293b; font-weight: 600;">L'équipe ${company}</p>`;

  const subject = `Votre facture ${v.invoiceNumber} — ${company}`;

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
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff;">
              <div style="font-size: 13px; letter-spacing: 1px; opacity: 0.85; text-transform: uppercase;">${company}</div>
              <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 700;">Votre facture</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
              <p style="margin: 0 0 16px;">Veuillez trouver ci-joint votre facture <strong>${v.invoiceNumber}</strong> d'un montant de <strong style="color: #dc2626;">${fmtEUR(v.totalTTC)} TTC</strong>.</p>
              ${dueLine}
              ${messageLine}

              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; margin: 16px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Numéro de facture</div>
                    <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">${v.invoiceNumber}</div>
                  </td>
                  <td style="padding: 16px 20px; text-align: right;">
                    <div style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">À payer (TTC)</div>
                    <div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: #dc2626;">${fmtEUR(v.totalTTC)}</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 0; color: #475569; font-size: 14px;">Le détail de la facture est en pièce jointe au format PDF. Les coordonnées bancaires pour le règlement y figurent.</p>

              ${sig}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f8fafc; color: #64748b; font-size: 12px; text-align: center; border-top: 1px solid #e2e8f0;">
              ${company}
              ${env.COMPANY_ADDRESS ? `<br>${env.COMPANY_ADDRESS}` : ''}
              ${env.COMPANY_SIRET ? `<br>SIRET : ${env.COMPANY_SIRET}` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

Veuillez trouver ci-joint votre facture ${v.invoiceNumber} d'un montant de ${fmtEUR(v.totalTTC)} TTC.
${v.dueDate ? `Échéance : ${fmtDate(v.dueDate)}.\n` : ''}
${v.customMessage ? `${v.customMessage}\n` : ''}
Le détail de la facture est en pièce jointe au format PDF.

Cordialement,
${v.salesPersonName ?? `L'équipe ${company}`}
${company}`;

  return { subject, html, text };
}
