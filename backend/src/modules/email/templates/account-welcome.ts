/**
 * HTML template for the "client portal account created" welcome email.
 * Sent when the chatbot opens a portal account for a visitor.
 * All CSS inlined for maximum email-client compatibility.
 */

import { env } from '../../../config/env';

export interface AccountWelcomeEmailVars {
  clientFirstName: string;
  /** Login email for the portal. */
  email: string;
  /** Temporary password to communicate to the client. */
  tempPassword: string;
  /** URL of the client portal login page. */
  loginUrl: string;
}

export function renderAccountWelcomeEmail(v: AccountWelcomeEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const company = env.COMPANY_NAME;
  const greeting = `Bonjour ${v.clientFirstName},`;
  const subject = `Votre espace client ${company} est prêt`;

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
              <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 700;">Bienvenue dans votre espace client</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
              <p style="margin: 0 0 16px;">Votre espace client a été créé. Vous pouvez y suivre vos rendez-vous, vos devis et vos projets. Voici vos identifiants :</p>

              <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8fafc; border-radius: 8px; margin: 16px 0; padding: 8px 20px;">
                <tr><td style="padding: 6px 0; color: #64748b;">Email</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${v.email}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Mot de passe provisoire</td><td style="padding: 6px 0; text-align: right; font-weight: 600; font-family: monospace;">${v.tempPassword}</td></tr>
              </table>

              <table cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;"><tr><td align="center" bgcolor="#198754" style="border-radius: 8px;"><a href="${v.loginUrl}" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Accéder à mon espace</a></td></tr></table>

              <p style="margin: 16px 0 0; color: #475569; font-size: 14px;">Pour votre sécurité, pensez à modifier ce mot de passe provisoire dès votre première connexion.</p>

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

Votre espace client ${company} a été créé. Voici vos identifiants :
- Email : ${v.email}
- Mot de passe provisoire : ${v.tempPassword}

Accéder à mon espace : ${v.loginUrl}

Pour votre sécurité, pensez à modifier ce mot de passe provisoire dès votre première connexion.

À très bientôt,
L'équipe ${company}`;

  return { subject, html, text };
}
