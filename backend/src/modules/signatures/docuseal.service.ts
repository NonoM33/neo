/**
 * DocuSeal API client.
 *
 * Workflow:
 *   1. createSubmissionFromPdf(pdfBytes, title, signerName, signerEmail)
 *      → uploads the PDF to DocuSeal, creates a one-off template, opens a
 *      submission for the signer, returns the submission id + signing URL.
 *   2. getSubmission(submissionId) → polls the status (awaiting/completed/declined).
 *   3. Webhook events `form.completed` / `form.declined` / `form.opened`
 *      flip our local status (see signatures.service.handleDocusealWebhook).
 *
 * When DOCUSEAL_API_KEY is not set (typical in dev), every call returns a
 * synthetic fixture so the rest of the signing flow stays usable without
 * a real account. Real production usage requires the env var.
 *
 * Cloud SaaS: https://api.docuseal.com  (default in env.ts)
 * Self-hosted: set DOCUSEAL_BASE_URL to your instance.
 */

import { env } from '../../config/env';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DocusealSubmissionResult {
  /** DocuSeal numeric submission id used for status polling. */
  submissionId: number;
  /** Public signing URL the client opens to sign. */
  signingUrl: string;
  /** Slug used by DocuSeal in URLs and webhooks (alternative key). */
  slug: string;
}

export type DocusealStatus =
  | 'awaiting'
  | 'opened'
  | 'completed'
  | 'declined'
  | 'expired';

export interface DocusealSubmissionStatus {
  submissionId: number;
  status: DocusealStatus;
  completedAt: Date | null;
  signingUrl: string | null;
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

function isConfigured(): boolean {
  return Boolean(env.DOCUSEAL_API_KEY && env.DOCUSEAL_API_KEY.trim().length > 0);
}

async function docusealFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (!isConfigured()) {
    throw new Error('DocuSeal not configured — set DOCUSEAL_API_KEY');
  }
  const url = `${env.DOCUSEAL_BASE_URL.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Auth-Token': env.DOCUSEAL_API_KEY!,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  return response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a fresh DocuSeal template from a raw PDF then immediately open a
 * submission targeted at the given signer. Returns enough info to redirect
 * the client (signingUrl) and to poll later (submissionId/slug).
 */
export async function createSubmissionFromPdf(params: {
  pdfBytes: Uint8Array;
  title: string;
  signerName: string;
  signerEmail: string;
  /** Optional message/subject sent in the signer's invite email. */
  subject?: string;
  message?: string;
  /** When true (default), DocuSeal emails the signer. */
  sendEmail?: boolean;
}): Promise<DocusealSubmissionResult> {
  // Dev fallback — pretend we created a submission so the flow proceeds.
  if (!isConfigured()) {
    const fakeId = Math.floor(Math.random() * 1_000_000);
    const slug = `dev_${fakeId.toString(36)}`;
    console.log(
      `[docuseal] DOCUSEAL_API_KEY not set — returning fake submission #${fakeId} for "${params.signerEmail}".`,
    );
    return {
      submissionId: fakeId,
      signingUrl: `${env.PUBLIC_URL}/dev/docuseal/${slug}`,
      slug,
    };
  }

  // ── 1) Upload the PDF as a one-off template ──────────────────────────
  // DocuSeal accepts base64-encoded files via /api/templates/pdf so we
  // don't need multipart handling here.
  const pdfBase64 = Buffer.from(params.pdfBytes).toString('base64');

  const templateRes = await docusealFetch('/api/templates/pdf', {
    method: 'POST',
    body: JSON.stringify({
      name: params.title,
      documents: [
        {
          name: `${params.title.replace(/\s+/g, '_')}.pdf`,
          file: pdfBase64,
          // Auto-place a signature field on the last page in the lower-left
          // quadrant — matches the signature box drawn in contract-pdf.
          fields: [
            {
              name: 'signature_client',
              type: 'signature',
              role: 'Client',
              areas: [
                {
                  // values are percentages of the page
                  x: 8,
                  y: 78,
                  w: 40,
                  h: 10,
                  page: 1, // 0-indexed → page 2
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (!templateRes.ok) {
    const text = await templateRes.text().catch(() => '');
    throw new Error(
      `DocuSeal create template failed (${templateRes.status}): ${text}`,
    );
  }
  const tpl = (await templateRes.json()) as {
    id: number;
    slug?: string;
  };
  const templateId = tpl.id;
  if (!templateId) {
    throw new Error(
      `DocuSeal: missing template id in response: ${JSON.stringify(tpl)}`,
    );
  }

  // ── 2) Open the submission targeted at the signer ────────────────────
  const submissionRes = await docusealFetch('/api/submissions', {
    method: 'POST',
    body: JSON.stringify({
      template_id: templateId,
      send_email: params.sendEmail !== false,
      message: {
        subject: params.subject,
        body: params.message,
      },
      submitters: [
        {
          role: 'Client',
          name: params.signerName,
          email: params.signerEmail,
        },
      ],
    }),
  });

  if (!submissionRes.ok) {
    const text = await submissionRes.text().catch(() => '');
    throw new Error(
      `DocuSeal create submission failed (${submissionRes.status}): ${text}`,
    );
  }

  const submitters = (await submissionRes.json()) as Array<{
    id?: number;
    submission_id?: number;
    slug?: string;
    url?: string;
    embed_src?: string;
  }>;
  const first = Array.isArray(submitters) ? submitters[0] : null;
  if (!first) {
    throw new Error('DocuSeal: empty submitters response');
  }

  const submissionId = first.submission_id ?? first.id;
  const slug = first.slug ?? `s_${submissionId}`;
  const signingUrl =
    first.url ??
    first.embed_src ??
    `${env.DOCUSEAL_BASE_URL.replace(/\/$/, '')}/d/${slug}`;

  if (!submissionId) {
    throw new Error(
      `DocuSeal: missing submission id in response: ${JSON.stringify(submitters)}`,
    );
  }

  return {
    submissionId,
    slug,
    signingUrl,
  };
}

/** Read the current status of a DocuSeal submission. */
export async function getSubmissionStatus(
  submissionId: number,
): Promise<DocusealSubmissionStatus> {
  if (!isConfigured()) {
    // Dev fallback — keep status awaiting forever; the dev can use the
    // direct signing mode to flip a quote to "accepté".
    return {
      submissionId,
      status: 'awaiting',
      completedAt: null,
      signingUrl: null,
    };
  }

  const res = await docusealFetch(`/api/submissions/${submissionId}`);
  if (!res.ok) {
    throw new Error(`DocuSeal get submission failed (${res.status})`);
  }
  const data = (await res.json()) as {
    id: number;
    status?: string;
    completed_at?: string | null;
    submitters?: Array<{ status?: string; url?: string; embed_src?: string }>;
  };

  const submitter = data.submitters?.[0];
  const rawStatus = (data.status ?? submitter?.status ?? 'awaiting').toLowerCase();
  const normalized: DocusealStatus = (
    [
      'awaiting',
      'opened',
      'completed',
      'declined',
      'expired',
    ] as const
  ).includes(rawStatus as DocusealStatus)
    ? (rawStatus as DocusealStatus)
    : 'awaiting';

  return {
    submissionId: data.id ?? submissionId,
    status: normalized,
    completedAt: data.completed_at ? new Date(data.completed_at) : null,
    signingUrl: submitter?.url ?? submitter?.embed_src ?? null,
  };
}

/** Map DocuSeal statuses to our internal `signature_status` enum. */
export function mapDocusealStatus(s: DocusealStatus): string {
  switch (s) {
    case 'completed':
      return 'signed';
    case 'declined':
      return 'declined';
    case 'expired':
      return 'expired';
    case 'opened':
    case 'awaiting':
    default:
      return 'pending';
  }
}
