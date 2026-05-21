/**
 * HTML template for the "quote sent to client" email.
 * Single template, no external deps, all CSS inlined for max compatibility
 * across email clients (Gmail, Outlook, Apple Mail).
 */

import { env } from '../../../config/env';

export interface QuoteSentEmailVars {
  clientFirstName: string;
  clientLastName: string;
  quoteNumber: string;
  totalTTC: number;
  validUntil?: Date | null;
  /** Optional public link to view the quote (for tracking). */
  publicQuoteUrl?: string;
  /** Optional message from the salesperson. */
  customMessage?: string;
  /** Display name of the salesperson, e.g. "Renaud Cosson". */
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

export function renderQuoteSentEmail(v: QuoteSentEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const company = env.COMPANY_NAME;
  const greeting = `Bonjour ${v.clientFirstName} ${v.clientLastName},`;
  const validUntilLine = v.validUntil
    ? `<p style="margin: 0 0 16px; color: #475569;">Devis valable jusqu'au <strong>${fmtDate(v.validUntil)}</strong>.</p>`
    : '';
  const messageLine = v.customMessage
    ? `<div style="margin: 0 0 24px; padding: 16px 20px; background: #f8fafc; border-left: 3px solid #6366f1; border-radius: 4px; color: #334155; font-style: italic;">${v.customMessage}</div>`
    : '';
  const ctaButton = v.publicQuoteUrl
    ? `<table cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;"><tr><td align="center" bgcolor="#6366f1" style="border-radius: 8px;"><a href="${v.publicQuoteUrl}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Consulter mon devis</a></td></tr></table>`
    : '';
  const sig = v.salesPersonName
    ? `<p style="margin: 32px 0 4px; color: #1e293b;">Cordialement,</p><p style="margin: 0; color: #1e293b; font-weight: 600;">${v.salesPersonName}</p><p style="margin: 0; color: #64748b; font-size: 13px;">${company}</p>`
    : `<p style="margin: 32px 0 4px; color: #1e293b;">Cordialement,</p><p style="margin: 0; color: #1e293b; font-weight: 600;">L'équipe ${company}</p>`;

  const subject = `Votre devis ${v.quoteNumber} — ${company}`;

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
              <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 700;">Votre devis est prêt</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
              <p style="margin: 0 0 16px;">Veuillez trouver ci-joint votre devis <strong>${v.quoteNumber}</strong> d'un montant de <strong>${fmtEUR(v.totalTTC)} TTC</strong>.</p>
              ${validUntilLine}
              ${messageLine}

              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; margin: 16px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Numéro de devis</div>
                    <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">${v.quoteNumber}</div>
                  </td>
                  <td style="padding: 16px 20px; text-align: right;">
                    <div style="font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total TTC</div>
                    <div style="font-size: 18px; font-weight: 700; margin-top: 4px; color: #6366f1;">${fmtEUR(v.totalTTC)}</div>
                  </td>
                </tr>
              </table>

              ${ctaButton}

              <p style="margin: 16px 0 0; color: #475569; font-size: 14px;">Le devis détaillé est en pièce jointe au format PDF. Pour toute question ou modification, n'hésitez pas à nous répondre directement à cet email.</p>

              ${sig}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #f8fafc; color: #64748b; font-size: 12px; text-align: center; border-top: 1px solid #e2e8f0;">
              Cet email vous a été envoyé par ${company}.
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

Veuillez trouver ci-joint votre devis ${v.quoteNumber} d'un montant de ${fmtEUR(v.totalTTC)} TTC.
${v.validUntil ? `Valable jusqu'au ${fmtDate(v.validUntil)}.\n` : ''}
${v.customMessage ? `${v.customMessage}\n` : ''}
${v.publicQuoteUrl ? `Consulter le devis : ${v.publicQuoteUrl}\n` : ''}
Le devis détaillé est en pièce jointe au format PDF.

Cordialement,
${v.salesPersonName ?? `L'équipe ${company}`}
${company}`;

  return { subject, html, text };
}
