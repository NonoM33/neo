import type { Payment } from '../../db/schema/payments';

function formatEur(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

const SHELL_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f5f7fa; padding:24px; box-sizing:border-box; }
  .card { background:#fff; border-radius:20px; padding:40px; text-align:center; box-shadow:0 4px 24px rgba(0,0,0,.08); max-width:420px; width:100%; }
  .icon { font-size:56px; margin-bottom:8px; }
  h1 { font-size:22px; margin:8px 0 4px; color:#1a1d21; }
  .sub { color:#6c757d; font-size:14px; margin-bottom:24px; }
  .amount { font-size:38px; font-weight:700; color:#0d6efd; margin:16px 0 4px; }
  .ref { color:#6c757d; font-size:13px; margin-bottom:28px; }
  button { background:#0d6efd; color:#fff; border:none; border-radius:12px; padding:16px 24px; font-size:16px; font-weight:600; width:100%; cursor:pointer; }
  button:hover { background:#0b5ed7; }
  .secure { margin-top:18px; color:#9aa0a6; font-size:12px; }
  .notice { background:#fff3cd; color:#664d03; border-radius:10px; padding:12px; font-size:13px; margin-bottom:20px; }
  a.receipt { display:inline-block; margin-top:18px; color:#0d6efd; font-size:14px; }
`;

/** Page d'atterrissage : montant + bouton "Payer" (POST vers /checkout). */
export function renderPayLanding(
  payment: Payment,
  token: string,
  opts: { canceled?: boolean } = {}
): string {
  const notice = opts.canceled
    ? `<div class="notice">Paiement annulé. Vous pouvez réessayer ci-dessous.</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Paiement — Neo Domotique</title><style>${SHELL_STYLE}</style></head>
<body><div class="card">
  <div class="icon">💳</div>
  <h1>Paiement sécurisé</h1>
  <div class="sub">Neo Domotique</div>
  ${notice}
  <div class="amount">${formatEur(payment.amountCents, payment.currency)}</div>
  <div class="ref">${escapeHtml(payment.description ?? 'Paiement')}</div>
  <form method="POST" action="/payer/${encodeURIComponent(token)}/checkout">
    <button type="submit">Payer ${formatEur(payment.amountCents, payment.currency)}</button>
  </form>
  <div class="secure">🔒 Paiement traité par Stripe. Vos données bancaires ne transitent pas par nos serveurs.</div>
</div></body></html>`;
}

/** Page de confirmation après paiement réussi. */
export function renderPaySuccess(payment: Payment): string {
  const receipt = payment.receiptUrl
    ? `<a class="receipt" href="${escapeHtml(payment.receiptUrl)}" target="_blank" rel="noopener">Voir le reçu</a>`
    : '';
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Paiement confirmé</title><style>${SHELL_STYLE} h1{color:#1a7f45} body{background:#f0f9f0}</style></head>
<body><div class="card">
  <div class="icon">✅</div>
  <h1>Paiement confirmé</h1>
  <div class="sub">Merci pour votre règlement.</div>
  <div class="amount" style="color:#1a7f45">${formatEur(payment.amountCents, payment.currency)}</div>
  <div class="ref">${escapeHtml(payment.description ?? '')}</div>
  ${receipt}
  <div class="secure" style="margin-top:24px">Vous pouvez fermer cette fenêtre.</div>
</div></body></html>`;
}

/** Page d'erreur : lien invalide / expiré. */
export function renderPayInvalid(): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lien invalide</title><style>${SHELL_STYLE} h1{color:#c0392b}</style></head>
<body><div class="card">
  <div class="icon">⚠️</div>
  <h1>Lien invalide</h1>
  <div class="sub">Ce lien de paiement n'existe pas ou a expiré. Contactez Neo Domotique pour en obtenir un nouveau.</div>
</div></body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
