import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  signatureRequests,
  quotes,
  projects,
  clients,
  quoteLines,
} from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { buildSigningPage } from './signing-page';
import {
  generateContractPdf,
  type QuoteDataForPdf,
} from './contract-pdf.service';
import {
  createSubmissionFromPdf,
  getSubmissionStatus,
  mapDocusealStatus,
  type DocusealStatus,
} from './docuseal.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getQuoteWithDetails(
  quoteId: string,
): Promise<
  QuoteDataForPdf & { id: string; projectId: string; status: string }
> {
  const [row] = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      createdAt: quotes.createdAt,
      validUntil: quotes.validUntil,
      notes: quotes.notes,
      totalHT: quotes.totalHT,
      totalTVA: quotes.totalTVA,
      totalTTC: quotes.totalTTC,
      discount: quotes.discount,
      projectId: quotes.projectId,
      project: {
        name: projects.name,
        address: projects.address,
        city: projects.city,
        postalCode: projects.postalCode,
      },
      client: clients,
    })
    .from(quotes)
    .innerJoin(projects, eq(quotes.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!row) throw new NotFoundError('Devis');

  const lines = await db
    .select({
      description: quoteLines.description,
      quantity: quoteLines.quantity,
      unitPriceHT: quoteLines.unitPriceHT,
      tvaRate: quoteLines.tvaRate,
      totalHT: quoteLines.totalHT,
      clientOwned: quoteLines.clientOwned,
    })
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(quoteLines.sortOrder);

  return { ...row, lines };
}

// ---------------------------------------------------------------------------
// Direct signing (in-person on the tablet, no provider)
// ---------------------------------------------------------------------------

export async function createDirectSigningRequest(
  quoteId: string,
): Promise<{ id: string }> {
  const quoteData = await getQuoteWithDetails(quoteId);

  // Cancel any existing pending request first
  await db
    .update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(signatureRequests.quoteId, quoteId),
        eq(signatureRequests.status, 'pending'),
      ),
    );

  const clientName = quoteData.client
    ? `${quoteData.client.firstName} ${quoteData.client.lastName}`
    : 'Client';
  const clientEmail = quoteData.client?.email ?? '';

  const [request] = await db
    .insert(signatureRequests)
    .values({
      quoteId,
      status: 'pending',
      mode: 'direct',
      signerName: clientName,
      signerEmail: clientEmail,
    })
    .returning();

  return { id: request!.id };
}

export async function getSigningPage(
  signatureRequestId: string,
): Promise<string> {
  const [request] = await db
    .select()
    .from(signatureRequests)
    .where(eq(signatureRequests.id, signatureRequestId))
    .limit(1);

  if (!request) throw new NotFoundError('Demande de signature');

  const alreadySigned = request.status === 'signed';
  const quoteData = await getQuoteWithDetails(request.quoteId);
  return buildSigningPage(quoteData, signatureRequestId, alreadySigned);
}

export async function submitDirectSignature(
  signatureRequestId: string,
  signatureData: string,
): Promise<void> {
  const [request] = await db
    .select()
    .from(signatureRequests)
    .where(eq(signatureRequests.id, signatureRequestId))
    .limit(1);

  if (!request) throw new NotFoundError('Demande de signature');
  if (request.status === 'signed') return; // idempotent

  await db
    .update(signatureRequests)
    .set({
      status: 'signed',
      signatureData,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(signatureRequests.id, signatureRequestId));

  // Update quote to accepted
  await db
    .update(quotes)
    .set({ status: 'accepte', updatedAt: new Date() })
    .where(eq(quotes.id, request.quoteId));
}

// ---------------------------------------------------------------------------
// Remote signing (DocuSeal via email)
// ---------------------------------------------------------------------------

export async function createRemoteSigningRequest(quoteId: string): Promise<{
  id: string;
  sentTo: string;
  signingUrl: string | null;
}> {
  const quoteData = await getQuoteWithDetails(quoteId);

  if (!quoteData.client?.email) {
    throw new Error(
      "Le client doit avoir une adresse email pour la signature à distance",
    );
  }

  const clientName = `${quoteData.client.firstName} ${quoteData.client.lastName}`;
  const clientEmail = quoteData.client.email;

  // Cancel any existing pending request
  await db
    .update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(signatureRequests.quoteId, quoteId),
        eq(signatureRequests.status, 'pending'),
      ),
    );

  // Generate the contract PDF (provider-agnostic)
  const pdfBytes = await generateContractPdf(quoteData);

  // Open a DocuSeal submission (DocuSeal emails the signer)
  const subject = `Devis N° ${quoteData.number} — NEO Domotique`;
  const message = `Bonjour ${quoteData.client.firstName},\n\nVeuillez trouver ci-joint le devis N° ${quoteData.number} d'un montant de ${quoteData.totalTTC} € TTC pour le projet "${quoteData.project?.name}".\n\nMerci de le signer électroniquement.\n\nCordialement,\nNEO Domotique`;

  const submission = await createSubmissionFromPdf({
    pdfBytes,
    title: `Devis ${quoteData.number} — ${clientName}`,
    signerName: clientName,
    signerEmail: clientEmail,
    subject,
    message,
    sendEmail: true,
  });

  const [request] = await db
    .insert(signatureRequests)
    .values({
      quoteId,
      docusealSubmissionId: submission.submissionId,
      docusealSlug: submission.slug,
      signingUrl: submission.signingUrl,
      status: 'pending',
      mode: 'remote',
      signerName: clientName,
      signerEmail: clientEmail,
    })
    .returning();

  if (quoteData.status === 'brouillon') {
    await db
      .update(quotes)
      .set({ status: 'envoye', sentAt: new Date(), updatedAt: new Date() })
      .where(eq(quotes.id, quoteId));
  }

  return {
    id: request!.id,
    sentTo: clientEmail,
    signingUrl: submission.signingUrl,
  };
}

// ---------------------------------------------------------------------------
// Status / shared
// ---------------------------------------------------------------------------

export async function getSignatureRequest(quoteId: string) {
  const [request] = await db
    .select()
    .from(signatureRequests)
    .where(eq(signatureRequests.quoteId, quoteId))
    .orderBy(signatureRequests.createdAt)
    .limit(1);

  if (!request) return null;

  return {
    id: request.id,
    status: request.status,
    mode: request.mode,
    signingUrl: request.signingUrl,
    signerName: request.signerName,
    signerEmail: request.signerEmail,
    createdAt: request.createdAt,
  };
}

export async function refreshSignatureStatus(quoteId: string) {
  const [request] = await db
    .select()
    .from(signatureRequests)
    .where(eq(signatureRequests.quoteId, quoteId))
    .orderBy(signatureRequests.createdAt)
    .limit(1);

  if (!request || !request.docusealSubmissionId) return null;

  try {
    const status = await getSubmissionStatus(request.docusealSubmissionId);
    const newStatus = mapDocusealStatus(status.status);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (newStatus !== request.status) {
      updates.status = newStatus;
      if (newStatus === 'signed') {
        updates.completedAt = status.completedAt ?? new Date();
        await db
          .update(quotes)
          .set({ status: 'accepte', updatedAt: new Date() })
          .where(eq(quotes.id, quoteId));
      }
    }
    if (status.signingUrl && status.signingUrl !== request.signingUrl) {
      updates.signingUrl = status.signingUrl;
    }
    await db
      .update(signatureRequests)
      .set(updates)
      .where(eq(signatureRequests.id, request.id));
    return {
      status: newStatus,
      signingUrl: status.signingUrl ?? request.signingUrl,
    };
  } catch {
    return { status: request.status, signingUrl: request.signingUrl };
  }
}

export async function cancelSignatureRequest(quoteId: string): Promise<void> {
  await db
    .update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(
      and(
        eq(signatureRequests.quoteId, quoteId),
        eq(signatureRequests.status, 'pending'),
      ),
    );
}

// ---------------------------------------------------------------------------
// DocuSeal webhook
// ---------------------------------------------------------------------------

interface DocusealWebhookPayload {
  event_type?: string;
  data?: {
    id?: number;
    submission_id?: number;
    slug?: string;
    status?: string;
    completed_at?: string;
  };
}

export async function handleDocusealWebhook(
  payload: DocusealWebhookPayload,
): Promise<void> {
  const event = (payload.event_type ?? '').toLowerCase();
  const submissionId = payload.data?.submission_id ?? payload.data?.id;
  if (!submissionId) return;

  const [request] = await db
    .select()
    .from(signatureRequests)
    .where(eq(signatureRequests.docusealSubmissionId, submissionId))
    .limit(1);
  if (!request) return;

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (
    event === 'form.completed' ||
    event === 'submission.completed' ||
    payload.data?.status === 'completed'
  ) {
    updates.status = 'signed';
    updates.completedAt = payload.data?.completed_at
      ? new Date(payload.data.completed_at)
      : new Date();
    await db
      .update(quotes)
      .set({ status: 'accepte', updatedAt: new Date() })
      .where(eq(quotes.id, request.quoteId));
  } else if (
    event === 'form.declined' ||
    event === 'submission.declined' ||
    payload.data?.status === 'declined'
  ) {
    updates.status = 'declined';
    await db
      .update(quotes)
      .set({ status: 'refuse', updatedAt: new Date() })
      .where(eq(quotes.id, request.quoteId));
  } else if (event === 'form.opened' || event === 'submission.opened') {
    // Just touch updatedAt; status stays pending.
  } else if (
    event === 'form.expired' ||
    payload.data?.status === 'expired'
  ) {
    updates.status = 'expired';
  }

  await db
    .update(signatureRequests)
    .set(updates)
    .where(eq(signatureRequests.id, request.id));
}

/**
 * Verify a DocuSeal webhook signature.
 *
 * DocuSeal sends an HMAC of the raw body in the `X-Docuseal-Signature`
 * header. When DOCUSEAL_WEBHOOK_SECRET is not configured (dev), we accept
 * everything (and log it).
 */
export async function verifyDocusealWebhook(
  rawBody: string,
  signature: string | undefined,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) {
    console.log('[docuseal] webhook accepted (no DOCUSEAL_WEBHOOK_SECRET set)');
    return true;
  }
  if (!signature) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqual(expected, signature);
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function previewContractPdf(quoteId: string): Promise<Uint8Array> {
  const quoteData = await getQuoteWithDetails(quoteId);
  return generateContractPdf(quoteData);
}

// Re-export DocuSeal status type for the routes layer
export type { DocusealStatus };
