import { env } from '../../config/env';

/**
 * Email service — Resend API.
 *
 * If RESEND_API_KEY is not set (typical in dev), emails are logged to stdout
 * instead of being sent. This lets the rest of the flow proceed normally
 * without a Resend account and without silent breakage in production
 * (a missing key is loud in logs).
 */

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content. */
  content: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Free-form tag/category for tracking (e.g. "quote-sent"). */
  tag?: string;
}

export interface SendEmailResult {
  id: string;
  provider: 'resend' | 'console';
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback — log and pretend it worked. Don't silently swallow:
    // log enough that the dev sees what would have been sent.
    const recipients = Array.isArray(params.to) ? params.to.join(', ') : params.to;
    console.log('[email] RESEND_API_KEY not set — email NOT sent. Would have sent:');
    console.log(`[email]   to: ${recipients}`);
    console.log(`[email]   subject: ${params.subject}`);
    console.log(`[email]   attachments: ${params.attachments?.length ?? 0}`);
    return { id: `console-${Date.now()}`, provider: 'console' };
  }

  const body: Record<string, unknown> = {
    from: env.EMAIL_FROM,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
  };

  if (params.text) body.text = params.text;
  const replyTo = params.replyTo ?? env.EMAIL_REPLY_TO;
  if (replyTo) body.reply_to = replyTo;
  if (params.tag) body.tags = [{ name: 'category', value: params.tag }];

  if (params.attachments?.length) {
    body.attachments = params.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      content_type: a.contentType,
    }));
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Resend API error ${res.status}: ${errText || res.statusText}`,
    );
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id, provider: 'resend' };
}
