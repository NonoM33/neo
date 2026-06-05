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
        <tr><td style="padding:34px 36px 26px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;">
          <div style="font-size:13px;letter-spacing:1px;opacity:.85;text-transform:uppercase;">{{company.name}}</div>
          <h1 style="margin:8px 0 0;font-size:25px;font-weight:800;">Bienvenue dans votre espace 🎉</h1>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 16px;font-size:16px;">Bonjour {{account.clientFirstName}},</p>
          <p style="margin:0 0 16px;">Votre espace client a été créé. Vous pouvez y suivre vos rendez-vous, vos devis et vos projets. Voici vos identifiants :</p>

          <table cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f8fafc;border-radius:12px;margin:16px 0;padding:8px 20px;">
            <tr><td style="padding:7px 0;color:#64748b;">Email</td><td style="padding:7px 0;text-align:right;font-weight:700;">{{account.email}}</td></tr>
            <tr><td style="padding:7px 0;color:#64748b;">Mot de passe provisoire</td><td style="padding:7px 0;text-align:right;font-weight:700;font-family:monospace;">{{account.tempPassword}}</td></tr>
          </table>

          <table cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;"><tr>
            <td align="center" bgcolor="#6366f1" style="border-radius:10px;">
              <a href="{{account.loginUrl}}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">Accéder à mon espace</a>
            </td>
          </tr></table>

          <p style="margin:16px 0 0;color:#475569;font-size:14px;">Pour votre sécurité, pensez à modifier ce mot de passe provisoire dès votre première connexion.</p>

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

export const accountWelcomeTemplate: TemplateDefinition = {
  key: 'account-welcome',
  kind: 'email',
  name: 'Email — Bienvenue espace client',
  description: 'Email envoyé à la création d’un compte espace client (identifiants).',
  subject: 'Votre espace client {{company.name}} est prêt',
  html,
  variables: [
    { token: 'company.name', label: 'Nom société' },
    { token: 'company.address', label: 'Adresse société' },
    { token: 'account.clientFirstName', label: 'Prénom client' },
    { token: 'account.email', label: 'Email de connexion' },
    { token: 'account.tempPassword', label: 'Mot de passe provisoire' },
    { token: 'account.loginUrl', label: 'Lien de connexion' },
  ],
  sampleData: {
    company: { name: 'Neo Domotique', address: '12 rue des Lilas, 75011 Paris' },
    account: {
      clientFirstName: 'Marie',
      email: 'marie.dupont@email.fr',
      tempPassword: 'Xz7-92ab',
      loginUrl: 'https://neo-domotique.fr/espace-client',
    },
  },
};
