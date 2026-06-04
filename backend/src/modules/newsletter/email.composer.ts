import {
  changelogCategoryLabels,
  type ChangelogEntry,
} from '../../db/schema';
import type { ReleaseWithEntries } from './changelog.service';

// Placeholders remplaces par destinataire au moment de l'envoi : on stocke un
// seul HTML de campagne, puis on injecte le pixel + lien de desinscription
// propres a chaque destinataire.
export const TRACKING_PIXEL_PLACEHOLDER = '{{TRACKING_PIXEL}}';
export const UNSUBSCRIBE_URL_PLACEHOLDER = '{{UNSUBSCRIBE_URL}}';

const CATEGORY_EMOJI: Record<ChangelogEntry['category'], string> = {
  nouveaute: '✨',
  amelioration: '⬆️',
  correction: '🔧',
};

const CATEGORY_COLOR: Record<ChangelogEntry['category'], string> = {
  nouveaute: '#0d6efd',
  amelioration: '#0dcaf0',
  correction: '#198754',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Rendu deterministe du corps a partir des releases groupees. Sert de repli
// quand l'IA n'est pas disponible, et de structure de reference pour l'IA.
export function renderBodyFromReleases(
  grouped: ReleaseWithEntries[]
): string {
  if (grouped.length === 0) {
    return '<p style="color:#6c757d">Aucune nouveaute a presenter.</p>';
  }

  const sections = grouped.map((release) => {
    const items = release.entries
      .map((entry) => {
        const label = changelogCategoryLabels[entry.category];
        const color = CATEGORY_COLOR[entry.category];
        const emoji = CATEGORY_EMOJI[entry.category];
        return `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #eef1f5;">
              <span style="display:inline-block;font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${emoji} ${escapeHtml(label.label)}</span>
              <div style="font-size:16px;font-weight:600;color:#212529;margin-top:4px;">${escapeHtml(entry.title)}</div>
              <div style="font-size:14px;color:#495057;margin-top:4px;line-height:1.5;">${escapeHtml(entry.description)}</div>
            </td>
          </tr>`;
      })
      .join('');

    return `
      <div style="margin-bottom:28px;">
        <h2 style="font-size:18px;color:#0d6efd;margin:0 0 4px;">${escapeHtml(release.title)}</h2>
        <div style="font-size:12px;color:#6c757d;margin-bottom:8px;">Version ${escapeHtml(release.version)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${items}</table>
      </div>`;
  });

  return sections.join('');
}

// Enveloppe HTML de marque autour du corps (genere par l'IA ou le repli).
// Contient les placeholders pixel + desinscription.
export function buildCampaignHtml(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a1d21 0%,#2d3339 100%);padding:28px 32px;">
              <div style="color:#ffffff;font-size:22px;font-weight:700;">Neo Domotique</div>
              <div style="color:#adb5bd;font-size:13px;margin-top:4px;">Les nouveautes de votre solution</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8f9fa;border-top:1px solid #eef1f5;text-align:center;">
              <div style="font-size:12px;color:#6c757d;line-height:1.6;">
                Vous recevez cet email car vous etes client Neo Domotique.<br />
                <a href="${UNSUBSCRIBE_URL_PLACEHOLDER}" style="color:#6c757d;text-decoration:underline;">Se desinscrire</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${TRACKING_PIXEL_PLACEHOLDER}
</body>
</html>`;
}

export interface PersonalizeParams {
  pixelUrl: string;
  unsubscribeUrl: string;
}

// Remplace les placeholders par les valeurs propres au destinataire.
export function personalizeHtml(
  html: string,
  { pixelUrl, unsubscribeUrl }: PersonalizeParams
): string {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;
  return html
    .split(TRACKING_PIXEL_PLACEHOLDER)
    .join(pixel)
    .split(UNSUBSCRIBE_URL_PLACEHOLDER)
    .join(unsubscribeUrl);
}

// Version texte brut (fallback / accessibilite) a partir des releases groupees.
export function renderTextFromReleases(
  grouped: ReleaseWithEntries[],
  unsubscribeUrl: string
): string {
  const lines: string[] = ['Neo Domotique — Les nouveautes\n'];
  for (const release of grouped) {
    lines.push(`## ${release.title} (version ${release.version})`);
    for (const entry of release.entries) {
      const label = changelogCategoryLabels[entry.category].label;
      lines.push(`- [${label}] ${entry.title}: ${entry.description}`);
    }
    lines.push('');
  }
  lines.push(`Se desinscrire : ${unsubscribeUrl}`);
  return lines.join('\n');
}
