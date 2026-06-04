import { sendEmail } from '../email/email.service';
import { env } from '../../config/env';
import { recetteKindLabels } from '../../db/schema';
import type { RecetteFeedback } from '../../db/schema';

export interface FeedbackClosureEmailInput {
  to: string;
  title: string;
  kind: RecetteFeedback['kind'];
  /** Dernier commentaire de l'equipe (resolution), affiche au rapporteur. */
  resolution: string | null;
}

// Construit le contenu de l'email de cloture (logique pure, testable).
export function buildClosureEmail(input: FeedbackClosureEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const kindLabel = recetteKindLabels[input.kind].label.toLowerCase();
  const company = env.COMPANY_NAME;
  const subject = `Votre retour a ete traite — ${input.title}`;

  const resolutionBlock = input.resolution
    ? `<p style="margin:16px 0 4px;font-weight:600;color:#111">Reponse de l'equipe</p>
       <div style="background:#f5f7fa;border-radius:8px;padding:12px 16px;color:#333;white-space:pre-wrap">${escapeHtml(
         input.resolution
       )}</div>`
    : '';

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
    <h2 style="color:#111;font-size:20px">Merci pour votre retour 🙏</h2>
    <p>Bonjour,</p>
    <p>Votre ${kindLabel} <strong>« ${escapeHtml(input.title)} »</strong> a ete traite et cloture.</p>
    ${resolutionBlock}
    <p style="margin-top:20px">N'hesitez pas a nous remonter tout autre souci via le bouton de feedback.</p>
    <p style="margin-top:24px;color:#888;font-size:13px">— L'equipe ${escapeHtml(company)}</p>
  </div>`;

  const text = [
    'Merci pour votre retour.',
    '',
    `Votre ${kindLabel} « ${input.title} » a ete traite et cloture.`,
    input.resolution ? `\nReponse de l'equipe :\n${input.resolution}` : '',
    '',
    `— L'equipe ${company}`,
  ].join('\n');

  return { subject, html, text };
}

export async function sendFeedbackClosureEmail(
  input: FeedbackClosureEmailInput
): Promise<void> {
  const { subject, html, text } = buildClosureEmail(input);
  await sendEmail({ to: input.to, subject, html, text, tag: 'feedback-closure' });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
