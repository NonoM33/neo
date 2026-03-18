import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database';
import { signatureRequests, quotes, projects, clients, quoteLines } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { buildSigningPage } from './signing-page';
import {
  generateContractPdf,
  createDocumensoDocument,
  addDocumensoRecipient,
  addDocumensoSignatureField,
  sendDocumensoDocument,
  getDocumensoDocument,
  type QuoteDataForPdf,
} from './documenso.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getQuoteWithDetails(quoteId: string): Promise<QuoteDataForPdf & { id: string; projectId: string; status: string }> {
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
// Direct signing (in-person, no Documenso)
// ---------------------------------------------------------------------------

export async function createDirectSigningRequest(quoteId: string): Promise<{ id: string }> {
  const quoteData = await getQuoteWithDetails(quoteId);

  // Cancel any existing pending request first
  await db
    .update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(signatureRequests.quoteId, quoteId), eq(signatureRequests.status, 'pending')));

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

export async function getSigningPage(signatureRequestId: string): Promise<string> {
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
// Remote signing (Documenso via email)
// ---------------------------------------------------------------------------

export async function createRemoteSigningRequest(quoteId: string): Promise<{
  id: string;
  sentTo: string;
}> {
  const quoteData = await getQuoteWithDetails(quoteId);

  if (!quoteData.client?.email) {
    throw new Error('Le client doit avoir une adresse email pour la signature à distance');
  }

  const clientName = `${quoteData.client.firstName} ${quoteData.client.lastName}`;
  const clientEmail = quoteData.client.email;

  // Cancel existing pending
  await db
    .update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(signatureRequests.quoteId, quoteId), eq(signatureRequests.status, 'pending')));

  // Generate PDF
  const pdfBytes = await generateContractPdf(quoteData);

  // Create Documenso document
  const { documentId } = await createDocumensoDocument(
    pdfBytes,
    `Devis ${quoteData.number} — ${clientName}`,
  );

  const { recipientId } = await addDocumensoRecipient(documentId, clientName, clientEmail);
  await addDocumensoSignatureField(documentId, recipientId);

  const subject = `Devis N° ${quoteData.number} — NEO Domotique`;
  const message = `Bonjour ${quoteData.client.firstName},\n\nVeuillez trouver ci-joint le devis N° ${quoteData.number} d'un montant de ${quoteData.totalTTC} € TTC pour le projet "${quoteData.project?.name}".\n\nMerci de le signer électroniquement.\n\nCordialement,\nNEO Domotique`;
  await sendDocumensoDocument(documentId, true, subject, message);

  const [request] = await db
    .insert(signatureRequests)
    .values({
      quoteId,
      documensoDocumentId: documentId,
      status: 'pending',
      mode: 'remote',
      signerName: clientName,
      signerEmail: clientEmail,
    })
    .returning();

  if (quoteData.status === 'brouillon') {
    await db.update(quotes).set({ status: 'envoye', sentAt: new Date(), updatedAt: new Date() }).where(eq(quotes.id, quoteId));
  }

  return { id: request!.id, sentTo: clientEmail };
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

  if (!request || !request.documensoDocumentId) return null;

  try {
    const doc = await getDocumensoDocument(request.documensoDocumentId);
    const statusMap: Record<string, string> = { COMPLETED: 'signed', PENDING: 'pending', DRAFT: 'draft', DECLINED: 'declined', EXPIRED: 'expired' };
    const newStatus = statusMap[doc.status.toUpperCase()] ?? request.status;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (newStatus !== request.status) {
      updates.status = newStatus;
      if (newStatus === 'signed') {
        updates.completedAt = new Date();
        await db.update(quotes).set({ status: 'accepte', updatedAt: new Date() }).where(eq(quotes.id, quoteId));
      }
    }
    await db.update(signatureRequests).set(updates).where(eq(signatureRequests.id, request.id));
    return { status: newStatus, signingUrl: doc.signingUrl ?? request.signingUrl };
  } catch {
    return { status: request.status, signingUrl: request.signingUrl };
  }
}

export async function cancelSignatureRequest(quoteId: string): Promise<void> {
  await db
    .update(signatureRequests)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(signatureRequests.quoteId, quoteId), eq(signatureRequests.status, 'pending')));
}

export async function handleDocumensoWebhook(payload: any): Promise<void> {
  const event = payload.event ?? payload.type;
  const documentId = payload.documentId ?? payload.document?.id;
  if (!documentId) return;

  const [request] = await db.select().from(signatureRequests).where(eq(signatureRequests.documensoDocumentId, documentId)).limit(1);
  if (!request) return;

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (event === 'document.completed' || event === 'DOCUMENT_COMPLETED') {
    updates.status = 'signed'; updates.completedAt = new Date();
    await db.update(quotes).set({ status: 'accepte', updatedAt: new Date() }).where(eq(quotes.id, request.quoteId));
  } else if (event === 'document.declined' || event === 'DOCUMENT_DECLINED') {
    updates.status = 'declined';
    await db.update(quotes).set({ status: 'refuse', updatedAt: new Date() }).where(eq(quotes.id, request.quoteId));
  }
  await db.update(signatureRequests).set(updates).where(eq(signatureRequests.id, request.id));
}

export async function previewContractPdf(quoteId: string): Promise<Uint8Array> {
  const quoteData = await getQuoteWithDetails(quoteId);
  return generateContractPdf(quoteData);
}
