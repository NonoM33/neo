/**
 * Public order tracking page — rendered as a self-contained HTML
 * document so the client can open it from an email link without any
 * frontend bundle.
 *
 * Shows a 5-step vertical timeline:
 *   1. Devis signé
 *   2. Commande confirmée
 *   3. Paiement reçu
 *   4. En préparation / expédition
 *   5. Livré
 * with the current step highlighted.
 */

import { env } from '../../config/env';

type OrderStatus =
  | 'en_attente'
  | 'confirmee'
  | 'payee'
  | 'en_preparation'
  | 'expediee'
  | 'livree'
  | 'annulee';

export interface OrderTrackingPageData {
  number: string;
  status: OrderStatus;
  totalTTC: string | null;
  createdAt: Date | null;
  confirmedAt: Date | null;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  projectName: string | null;
}

function fmtDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtTime(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtEur(v: string | null): string {
  if (!v) return '';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(parseFloat(v));
}

interface Step {
  key: OrderStatus | 'devis';
  label: string;
  description: string;
  doneAt: Date | null;
}

/**
 * Order in which the steps progress on the customer-facing timeline.
 * Steps before the current status are "done", the matching one is
 * "current", anything after is "todo". `devis` is a synthetic
 * pre-status that's always done by the time we have an order.
 */
const STEP_ORDER: Array<Step['key']> = [
  'devis',
  'confirmee',
  'payee',
  'en_preparation',
  'expediee',
  'livree',
];

function statusIndex(status: OrderStatus): number {
  // en_attente lands here on creation; treat it as "confirmee in progress"
  // for the customer (we don't expose the internal en_attente state).
  if (status === 'en_attente') return STEP_ORDER.indexOf('confirmee');
  return STEP_ORDER.indexOf(status as Step['key']);
}

function escape(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderOrderTrackingPage(data: OrderTrackingPageData): string {
  // Build the steps the customer expects to see, with the dates we have.
  const steps: Step[] = [
    {
      key: 'devis',
      label: 'Devis signé',
      description: 'Votre devis a été accepté et signé.',
      // The order can't be created without an accepted quote, so creation
      // date stands in for "devis signé" on this public-facing timeline.
      doneAt: data.createdAt,
    },
    {
      key: 'confirmee',
      label: 'Commande confirmée',
      description: 'Votre commande a été enregistrée par nos équipes.',
      doneAt: data.confirmedAt ?? data.createdAt,
    },
    {
      key: 'payee',
      label: 'Paiement reçu',
      description: 'Votre paiement a bien été reçu.',
      doneAt: data.paidAt,
    },
    {
      key: 'en_preparation',
      label: 'En préparation',
      description: 'Nos équipes préparent votre commande.',
      doneAt:
        data.status === 'en_preparation' ||
        data.status === 'expediee' ||
        data.status === 'livree'
          ? data.shippedAt ?? data.paidAt ?? data.createdAt
          : null,
    },
    {
      key: 'expediee',
      label: 'Expédiée',
      description: data.carrier
        ? `Confiée au transporteur ${data.carrier}.`
        : 'Votre commande est partie chez vous.',
      doneAt: data.shippedAt,
    },
    {
      key: 'livree',
      label: 'Livrée',
      description: 'Votre installation est arrivée.',
      doneAt: data.deliveredAt,
    },
  ];

  const cancelled = data.status === 'annulee';

  const clientName =
    [data.clientFirstName, data.clientLastName].filter(Boolean).join(' ') ||
    'Client';

  const shippingLines = [
    data.shippingAddress,
    [data.shippingPostalCode, data.shippingCity].filter(Boolean).join(' '),
  ].filter(Boolean) as string[];

  const trackingLink =
    data.carrier && data.trackingNumber
      ? buildCarrierLink(data.carrier, data.trackingNumber)
      : null;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Suivi de commande ${escape(data.number)} — ${escape(env.COMPANY_NAME)}</title>
  <style>
    :root {
      --accent: #6366f1;
      --accent-dark: #4f46e5;
      --text: #1e293b;
      --muted: #64748b;
      --soft-bg: #f8fafc;
      --border: #e2e8f0;
      --success: #16a34a;
      --danger: #dc2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      color: var(--text);
      line-height: 1.5;
    }
    .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
    .header {
      background: linear-gradient(135deg, var(--accent), #a855f7);
      color: #fff;
      padding: 32px 24px;
      border-radius: 16px 16px 0 0;
    }
    .header .brand {
      font-size: 13px;
      letter-spacing: 1px;
      opacity: 0.85;
      text-transform: uppercase;
    }
    .header h1 { font-size: 24px; margin: 4px 0 0; font-weight: 700; }
    .card {
      background: #fff;
      border-radius: 0 0 16px 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      background: var(--soft-bg);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .summary .item { padding: 4px 0; }
    .summary .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
    }
    .summary .value { font-size: 16px; font-weight: 600; margin-top: 2px; }
    .summary .value.amount { color: var(--accent); }
    .cancelled {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: var(--danger);
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .timeline { position: relative; padding-left: 32px; }
    .timeline::before {
      content: "";
      position: absolute;
      left: 11px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--border);
    }
    .step { position: relative; padding: 8px 0 16px; }
    .step .dot {
      position: absolute;
      left: -28px;
      top: 6px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid var(--border);
    }
    .step.done .dot {
      background: var(--success);
      border-color: var(--success);
      box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
    }
    .step.done .dot::after {
      content: "";
      position: absolute;
      left: 5px;
      top: 2px;
      width: 6px;
      height: 10px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .step.current .dot {
      background: var(--accent);
      border-color: var(--accent);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.16);
      animation: pulse 1.6s ease-out infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.16); }
      50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.05); }
    }
    .step .step-label { font-weight: 600; margin-bottom: 2px; }
    .step.todo .step-label { color: var(--muted); }
    .step .step-date {
      font-size: 13px;
      color: var(--muted);
    }
    .step .step-desc {
      font-size: 14px;
      color: var(--muted);
      margin-top: 2px;
    }
    .shipping {
      background: var(--soft-bg);
      padding: 16px;
      border-radius: 12px;
      margin-top: 24px;
    }
    .shipping h3 {
      margin: 0 0 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
    }
    .shipping a {
      color: var(--accent);
      font-weight: 500;
      text-decoration: none;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      color: var(--muted);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="brand">${escape(env.COMPANY_NAME)}</div>
      <h1>Suivi de votre commande</h1>
    </div>
    <div class="card">
      <div class="summary">
        <div class="item">
          <div class="label">Commande</div>
          <div class="value">${escape(data.number)}</div>
        </div>
        <div class="item">
          <div class="label">Client</div>
          <div class="value">${escape(clientName)}</div>
        </div>
        ${
          data.projectName
            ? `<div class="item"><div class="label">Projet</div><div class="value">${escape(data.projectName)}</div></div>`
            : ''
        }
        ${
          data.totalTTC
            ? `<div class="item"><div class="label">Total TTC</div><div class="value amount">${escape(fmtEur(data.totalTTC))}</div></div>`
            : ''
        }
      </div>

      ${
        cancelled
          ? `<div class="cancelled">
              Cette commande a été annulée${data.cancelledAt ? ` le ${escape(fmtDate(data.cancelledAt))}` : ''}.
              <br>Pour toute question, contactez-nous.
            </div>`
          : ''
      }

      <div class="timeline">
        ${(() => {
          const currentIdx = statusIndex(data.status);
          return steps
            .map((step) => {
              const stepIdx = STEP_ORDER.indexOf(step.key);
              const isDone = !cancelled && stepIdx < currentIdx;
              const isCurrent = !cancelled && stepIdx === currentIdx;
              const cls = isDone
                ? 'step done'
                : isCurrent
                  ? 'step current'
                  : 'step todo';
              const dateLine = isDone && step.doneAt
                ? `<div class="step-date">${escape(fmtDate(step.doneAt))} à ${escape(fmtTime(step.doneAt))}</div>`
                : isCurrent
                  ? `<div class="step-date" style="color: var(--accent); font-weight: 500">En cours…</div>`
                  : '';
              return `<div class="${cls}">
                <div class="dot"></div>
                <div class="step-label">${escape(step.label)}</div>
                ${dateLine}
                <div class="step-desc">${escape(step.description)}</div>
              </div>`;
            })
            .join('');
        })()}
      </div>

      ${
        shippingLines.length
          ? `<div class="shipping">
              <h3>Adresse de livraison</h3>
              ${shippingLines.map((l) => `<div>${escape(l)}</div>`).join('')}
              ${
                trackingLink
                  ? `<div style="margin-top:10px"><a href="${escape(trackingLink)}" target="_blank">Suivre le colis chez ${escape(data.carrier)} →</a></div>`
                  : data.trackingNumber
                    ? `<div style="margin-top:10px;font-size:13px;color:var(--muted)">N° de suivi : <strong>${escape(data.trackingNumber)}</strong></div>`
                    : ''
              }
            </div>`
          : ''
      }

      <div class="footer">
        Une question ? Répondez à l'email de confirmation, nous sommes à votre écoute.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildCarrierLink(carrier: string, tracking: string): string | null {
  const c = carrier.toLowerCase();
  if (c.includes('colissimo') || c.includes('la poste'))
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(tracking)}`;
  if (c.includes('chronopost'))
    return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(tracking)}`;
  if (c.includes('dpd'))
    return `https://www.dpd.fr/trace/${encodeURIComponent(tracking)}`;
  if (c.includes('ups'))
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  if (c.includes('dhl'))
    return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${encodeURIComponent(tracking)}`;
  if (c.includes('mondial relay') || c.includes('mondialrelay'))
    return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(tracking)}`;
  return null;
}
