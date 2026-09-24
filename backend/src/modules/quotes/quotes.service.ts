import { eq, and, or, desc, ilike, count, sql, SQL, inArray } from 'drizzle-orm';
import { db } from '../../config/database';
import { quotes, quoteLines, projects, clients, products } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import { paginate, getOffset, type PaginationParams } from '../../lib/pagination';
import { sendEmail } from '../email';
import { validatePromoForOrder, recordRedemption } from '../marketing/promo-codes.service';
import { renderQuoteDocumentPdf, renderQuoteEmail } from '../templates/render';
import type { QuotePdfInput } from './quote-pdf.service';
import {
  nextQuoteNumber,
  quoteNumberPrefix,
  isDuplicateQuoteNumberError,
  QUOTE_NUMBER_MAX_ATTEMPTS,
} from './quote-number';
import type { CreateQuoteInput, UpdateQuoteInput, QuoteLineInput } from './quotes.schema';

// Roles that may manage every quote regardless of project ownership.
// Integrateurs remain scoped to the projects they own.
const QUOTE_MANAGER_ROLES = new Set(['admin', 'commercial']);

async function verifyProjectAccess(projectId: string, userId: string, userRole: string) {
  const conditions: SQL[] = [eq(projects.id, projectId)];

  if (!QUOTE_MANAGER_ROLES.has(userRole)) {
    conditions.push(eq(projects.userId, userId));
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(...conditions))
    .limit(1);

  if (!project) {
    throw new NotFoundError('Projet');
  }

  return project;
}

async function verifyQuoteAccess(quoteId: string, userId: string, userRole: string) {
  const [quote] = await db
    .select({
      id: quotes.id,
      projectId: quotes.projectId,
    })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  if (!quote) {
    throw new NotFoundError('Devis');
  }

  await verifyProjectAccess(quote.projectId, userId, userRole);

  return quote;
}

// Remove cost/margin fields from a quote response. The staff and mobile APIs
// must never expose purchase prices or margins to the client-facing layers.
export function stripQuoteCostFields<T extends Record<string, unknown>>(quote: T): T {
  const { totalCostHT, totalMarginHT, marginPercent, ...rest } = quote;
  void totalCostHT;
  void totalMarginHT;
  void marginPercent;

  const safeQuote = rest as Record<string, unknown>;

  if (Array.isArray(safeQuote.lines)) {
    safeQuote.lines = (safeQuote.lines as Record<string, unknown>[]).map((line) => {
      const { unitCostHT, ...safeLine } = line;
      void unitCostHT;
      return safeLine;
    });
  }

  return safeQuote as unknown as T;
}

export interface QuoteListFilters {
  search?: string;
  status?: (typeof quotes.status.enumValues)[number];
}

// Global, ownership-agnostic quote list for the staff back-office (admin/commercial).
export async function getAllQuotes(params: PaginationParams, filters: QuoteListFilters = {}) {
  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(quotes.status, filters.status));
  }

  if (filters.search) {
    conditions.push(
      or(
        ilike(quotes.number, `%${filters.search}%`),
        ilike(clients.firstName, `%${filters.search}%`),
        ilike(clients.lastName, `%${filters.search}%`),
        ilike(clients.email, `%${filters.search}%`)
      )!
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: quotes.id,
        number: quotes.number,
        status: quotes.status,
        totalTTC: quotes.totalTTC,
        createdAt: quotes.createdAt,
        sentAt: quotes.sentAt,
        validUntil: quotes.validUntil,
        project: { id: projects.id, name: projects.name },
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
      })
      .from(quotes)
      .innerJoin(projects, eq(quotes.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(where)
      .orderBy(desc(quotes.createdAt))
      .limit(params.limit)
      .offset(getOffset(params)),
    db
      .select({ total: count() })
      .from(quotes)
      .innerJoin(projects, eq(quotes.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(where),
  ]);

  const total = countResult[0]?.total ?? 0;
  return paginate(data, total, params);
}

function calculateTotals(lines: QuoteLineInput[], discount: number = 0, costMap?: Map<string, number>) {
  let totalHT = 0;
  let totalTVA = 0;
  let totalCostHT = 0;

  const calculatedLines = lines.map((line, index) => {
    const lineHT = line.quantity * line.unitPriceHT;
    const lineTVA = lineHT * (line.tvaRate / 100);

    // Snapshot du prix d'achat
    const unitCostHT = line.productId && costMap ? costMap.get(line.productId) ?? null : null;
    const lineCostHT = unitCostHT !== null ? line.quantity * unitCostHT : 0;

    // Les lignes clientOwned ne sont pas facturées ni comptées en coût
    if (!line.clientOwned) {
      totalHT += lineHT;
      totalTVA += lineTVA;
      totalCostHT += lineCostHT;
    }

    return {
      ...line,
      totalHT: lineHT,
      sortOrder: index,
      unitCostHT,
    };
  });

  // Apply discount
  const discountAmount = totalHT * (discount / 100);
  totalHT -= discountAmount;
  totalTVA -= discountAmount * 0.2; // Assuming 20% average TVA for discount
  totalCostHT -= totalCostHT * (discount / 100);

  const totalTTC = totalHT + totalTVA;
  const totalMarginHT = totalHT - totalCostHT;
  const marginPercent = totalHT > 0 ? (totalMarginHT / totalHT) * 100 : 0;

  return {
    lines: calculatedLines,
    totalHT,
    totalTVA,
    totalTTC,
    totalCostHT,
    totalMarginHT,
    marginPercent,
  };
}

type QuoteTotals = ReturnType<typeof calculateTotals>;

// Applique une remise promo (montant € HT) sur des totaux déjà calculés. La TVA
// est réduite au prorata (approximation 20% cohérente avec la remise %), et le
// coût d'achat reste inchangé : la remise promo ampute donc la marge réelle.
function applyPromoToTotals(totals: QuoteTotals, promoDiscount: number): QuoteTotals {
  const totalHT = totals.totalHT - promoDiscount;
  const totalTVA = totals.totalTVA - promoDiscount * 0.2;
  const totalTTC = totalHT + totalTVA;
  const totalMarginHT = totalHT - totals.totalCostHT;
  const marginPercent = totalHT > 0 ? (totalMarginHT / totalHT) * 100 : 0;
  return { ...totals, totalHT, totalTVA, totalTTC, totalMarginHT, marginPercent };
}

interface ResolvedPromo {
  code: string;
  promoId: string;
  discount: number;
  clientId: string | null;
  email: string | undefined;
}

// Calcule les totaux finaux d'un devis à partir de totaux de base et d'un code
// promo effectif (null = aucun/retiré), écrit le résultat dans `updateData`, et
// comptabilise une nouvelle utilisation seulement si le code a réellement changé.
async function applyPromoToUpdateData(params: {
  quoteId: string;
  projectId: string;
  baseTotals: QuoteTotals;
  effectiveCode: string | null;
  existingPromoCode: string | null;
  updateData: Record<string, any>;
}): Promise<void> {
  const { quoteId, projectId, baseTotals, effectiveCode, existingPromoCode, updateData } = params;

  const promo = effectiveCode
    ? await resolvePromoForProject(projectId, effectiveCode, baseTotals.totalHT)
    : null;
  const totals = promo ? applyPromoToTotals(baseTotals, promo.discount) : baseTotals;

  updateData.promoCode = promo?.code ?? null;
  updateData.promoDiscount = (promo?.discount ?? 0).toFixed(2);
  updateData.totalHT = totals.totalHT.toFixed(2);
  updateData.totalTVA = totals.totalTVA.toFixed(2);
  updateData.totalTTC = totals.totalTTC.toFixed(2);
  updateData.totalCostHT = totals.totalCostHT.toFixed(2);
  updateData.totalMarginHT = totals.totalMarginHT.toFixed(2);
  updateData.marginPercent = totals.marginPercent.toFixed(2);

  if (promo && promo.code !== existingPromoCode) {
    await recordRedemption({
      promoCodeId: promo.promoId,
      quoteId,
      clientId: promo.clientId ?? undefined,
      email: promo.email,
      discountAmount: promo.discount,
    });
  }
}

// Reconstruit les lignes d'un devis (au format d'entrée) depuis la base, pour
// recalculer les totaux sans que l'appelant ait à renvoyer les lignes.
async function loadExistingLineInputs(quoteId: string): Promise<QuoteLineInput[]> {
  const rows = await db
    .select({
      productId: quoteLines.productId,
      description: quoteLines.description,
      quantity: quoteLines.quantity,
      unitPriceHT: quoteLines.unitPriceHT,
      tvaRate: quoteLines.tvaRate,
      clientOwned: quoteLines.clientOwned,
      clientOwnedPhotoUrl: quoteLines.clientOwnedPhotoUrl,
    })
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(quoteLines.sortOrder);

  return rows.map((r) => ({
    productId: r.productId ?? undefined,
    description: r.description,
    quantity: r.quantity,
    unitPriceHT: Number(r.unitPriceHT),
    tvaRate: Number(r.tvaRate),
    clientOwned: r.clientOwned,
    clientOwnedPhotoUrl: r.clientOwnedPhotoUrl ?? undefined,
  }));
}

// Valide un code promo pour le devis d'un projet (en s'appuyant sur l'identité
// client pour la règle "une fois par client") et renvoie la remise applicable.
async function resolvePromoForProject(
  projectId: string,
  promoCode: string,
  baseTotalHT: number,
): Promise<ResolvedPromo> {
  const [project] = await db
    .select({ clientId: projects.clientId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  let email: string | undefined;
  const clientId = project?.clientId ?? null;
  if (clientId) {
    const [client] = await db
      .select({ email: clients.email })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    email = client?.email ?? undefined;
  }

  const { promo, discountAmount } = await validatePromoForOrder(promoCode, baseTotalHT, {
    email,
    clientId: clientId ?? undefined,
  });

  return { code: promo.code, promoId: promo.id, discount: discountAmount, clientId, email };
}

async function buildCostMap(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const productsData = await db
    .select({ id: products.id, purchasePriceHT: products.purchasePriceHT })
    .from(products)
    .where(inArray(products.id, productIds));
  return new Map(
    productsData
      .filter(p => p.purchasePriceHT !== null)
      .map(p => [p.id, parseFloat(p.purchasePriceHT!)])
  );
}

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = quoteNumberPrefix(year);

  // LIKE, et surtout PAS `eq` : le motif porte un '%'. Avec une egalite la
  // requete ne remontait jamais rien, la sequence restait bloquee a 1, et le
  // 2e devis de l'annee violait la contrainte d'unicite sur `number` — donc
  // plus aucun devis creable. Meme forme que les commandes et les factures.
  const [latest] = await db
    .select({ number: quotes.number })
    .from(quotes)
    .where(sql`${quotes.number} LIKE ${prefix + '%'}`)
    .orderBy(desc(quotes.number))
    .limit(1);

  return nextQuoteNumber(year, latest?.number);
}

export async function getQuotesByProject(projectId: string, userId: string, userRole: string) {
  await verifyProjectAccess(projectId, userId, userRole);

  const quotesList = await db
    .select()
    .from(quotes)
    .where(eq(quotes.projectId, projectId))
    .orderBy(desc(quotes.createdAt));

  return quotesList;
}

export async function getQuoteById(id: string, userId: string, userRole: string) {
  await verifyQuoteAccess(id, userId, userRole);

  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, id))
    .limit(1);

  const lines = await db
    .select({
      id: quoteLines.id,
      description: quoteLines.description,
      quantity: quoteLines.quantity,
      unitPriceHT: quoteLines.unitPriceHT,
      tvaRate: quoteLines.tvaRate,
      totalHT: quoteLines.totalHT,
      sortOrder: quoteLines.sortOrder,
      clientOwned: quoteLines.clientOwned,
      clientOwnedPhotoUrl: quoteLines.clientOwnedPhotoUrl,
      product: {
        id: products.id,
        reference: products.reference,
        name: products.name,
      },
    })
    .from(quoteLines)
    .leftJoin(products, eq(quoteLines.productId, products.id))
    .where(eq(quoteLines.quoteId, id))
    .orderBy(quoteLines.sortOrder);

  return {
    ...quote,
    lines,
  };
}

export async function createQuote(
  projectId: string,
  input: CreateQuoteInput,
  userId: string,
  userRole: string
) {
  await verifyProjectAccess(projectId, userId, userRole);

  // Build cost map from product purchase prices
  const productIds = input.lines
    .filter(l => l.productId)
    .map(l => l.productId!);
  const costMap = await buildCostMap(productIds);

  const baseTotals = calculateTotals(input.lines, input.discount, costMap);
  const lines = baseTotals.lines;

  // Code promo : validé sur le total HT après remise %, puis appliqué.
  const promo = input.promoCode
    ? await resolvePromoForProject(projectId, input.promoCode, baseTotals.totalHT)
    : null;
  const totals = promo ? applyPromoToTotals(baseTotals, promo.discount) : baseTotals;

  // Le numero est calcule PUIS insere, sans verrou : deux devis crees au meme
  // instant visent le meme numero. Le perdant re-tente avec le suivant plutot
  // que de renvoyer une erreur a l'utilisateur.
  let quote: typeof quotes.$inferSelect | undefined;

  for (let attempt = 0; attempt < QUOTE_NUMBER_MAX_ATTEMPTS; attempt++) {
    const number = await generateQuoteNumber();

    try {
      [quote] = await db
        .insert(quotes)
        .values({
          projectId,
          number,
          status: 'brouillon',
          validUntil: input.validUntil,
          discount: input.discount?.toString(),
          promoCode: promo?.code ?? null,
          promoDiscount: (promo?.discount ?? 0).toFixed(2),
          notes: input.notes,
          totalHT: totals.totalHT.toFixed(2),
          totalTVA: totals.totalTVA.toFixed(2),
          totalTTC: totals.totalTTC.toFixed(2),
          totalCostHT: totals.totalCostHT.toFixed(2),
          totalMarginHT: totals.totalMarginHT.toFixed(2),
          marginPercent: totals.marginPercent.toFixed(2),
        })
        .returning();
      break;
    } catch (error) {
      if (isDuplicateQuoteNumberError(error) && attempt < QUOTE_NUMBER_MAX_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }

  if (!quote) {
    throw new NotFoundError('Devis');
  }

  if (promo) {
    await recordRedemption({
      promoCodeId: promo.promoId,
      quoteId: quote.id,
      clientId: promo.clientId ?? undefined,
      email: promo.email,
      discountAmount: promo.discount,
    });
  }

  // Insert lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const inputLine = input.lines[i];
    await db.insert(quoteLines).values({
      quoteId: quote.id,
      productId: line.productId,
      description: line.description,
      quantity: line.quantity,
      unitPriceHT: line.unitPriceHT.toFixed(2),
      tvaRate: line.tvaRate.toFixed(2),
      totalHT: line.totalHT.toFixed(2),
      sortOrder: line.sortOrder,
      unitCostHT: line.unitCostHT !== null ? line.unitCostHT.toFixed(2) : null,
      clientOwned: inputLine?.clientOwned ?? false,
      clientOwnedPhotoUrl: inputLine?.clientOwnedPhotoUrl,
    });
  }

  return getQuoteById(quote.id, userId, userRole);
}

export async function updateQuote(
  id: string,
  input: UpdateQuoteInput,
  userId: string,
  userRole: string
) {
  const existing = await verifyQuoteAccess(id, userId, userRole);
  const [{ promoCode: existingPromoCode, discount: existingDiscount } = { promoCode: null, discount: null }] =
    await db
      .select({ promoCode: quotes.promoCode, discount: quotes.discount })
      .from(quotes)
      .where(eq(quotes.id, id))
      .limit(1);

  const updateData: Record<string, any> = { updatedAt: new Date() };

  if (input.status) updateData.status = input.status;
  if (input.validUntil) updateData.validUntil = input.validUntil;
  if (input.notes !== undefined) updateData.notes = input.notes;

  if (input.lines) {
    // Delete existing lines
    await db.delete(quoteLines).where(eq(quoteLines.quoteId, id));

    // Build cost map from product purchase prices
    const productIds = input.lines
      .filter(l => l.productId)
      .map(l => l.productId!);
    const costMap = await buildCostMap(productIds);

    // Recalculate base totals (lignes + remise %)
    const baseTotals = calculateTotals(input.lines, input.discount ?? 0, costMap);
    const lines = baseTotals.lines;

    // Code promo effectif : null = retiré, string = nouveau, undefined = conservé.
    const effectiveCode =
      input.promoCode === null ? null : input.promoCode ?? existingPromoCode;

    await applyPromoToUpdateData({
      quoteId: id,
      projectId: existing.projectId,
      baseTotals,
      effectiveCode,
      existingPromoCode,
      updateData,
    });

    if (input.discount !== undefined) {
      updateData.discount = input.discount.toFixed(2);
    }

    // Insert new lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const inputLine = input.lines![i];
      await db.insert(quoteLines).values({
        quoteId: id,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPriceHT: line.unitPriceHT.toFixed(2),
        tvaRate: line.tvaRate.toFixed(2),
        totalHT: line.totalHT.toFixed(2),
        sortOrder: line.sortOrder,
        unitCostHT: line.unitCostHT !== null ? line.unitCostHT.toFixed(2) : null,
        clientOwned: inputLine?.clientOwned ?? false,
        clientOwnedPhotoUrl: inputLine?.clientOwnedPhotoUrl,
      });
    }
  } else if (input.promoCode !== undefined) {
    // Application/retrait d'un code promo sans renvoyer les lignes : on recalcule
    // les totaux à partir des lignes déjà enregistrées.
    const existingLines = await loadExistingLineInputs(id);
    const productIds = existingLines.filter((l) => l.productId).map((l) => l.productId!);
    const costMap = await buildCostMap(productIds);
    const baseTotals = calculateTotals(
      existingLines,
      input.discount ?? Number(existingDiscount ?? 0),
      costMap,
    );
    const effectiveCode = input.promoCode === null ? null : input.promoCode;

    await applyPromoToUpdateData({
      quoteId: id,
      projectId: existing.projectId,
      baseTotals,
      effectiveCode,
      existingPromoCode,
      updateData,
    });

    if (input.discount !== undefined) {
      updateData.discount = input.discount.toFixed(2);
    }
  }

  await db.update(quotes).set(updateData).where(eq(quotes.id, id));

  return getQuoteById(id, userId, userRole);
}

export async function deleteQuote(id: string, userId: string, userRole: string) {
  await verifyQuoteAccess(id, userId, userRole);
  await db.delete(quotes).where(eq(quotes.id, id));
}

export interface SendQuoteOptions {
  customMessage?: string;
  salesPersonName?: string;
}

// Build the shared PDF/email input from a fully-loaded quote (project + client
// + lines). Used by both the preview/render path and the send path.
function toQuotePdfInput(
  fullQuote: Awaited<ReturnType<typeof getQuoteWithProjectDetails>>,
): QuotePdfInput {
  return {
    quote: {
      number: fullQuote.number,
      createdAt: fullQuote.createdAt,
      validUntil: fullQuote.validUntil,
      totalHT: fullQuote.totalHT,
      totalTVA: fullQuote.totalTVA,
      totalTTC: fullQuote.totalTTC,
      discount: fullQuote.discount,
      notes: fullQuote.notes,
    },
    client: {
      firstName: fullQuote.client?.firstName ?? '',
      lastName: fullQuote.client?.lastName ?? '',
      email: fullQuote.client?.email ?? null,
      address: fullQuote.client?.address ?? null,
      postalCode: fullQuote.client?.postalCode ?? null,
      city: fullQuote.client?.city ?? null,
    },
    project: {
      name: fullQuote.project?.name ?? '',
      address: fullQuote.project?.address ?? null,
      city: fullQuote.project?.city ?? null,
      postalCode: fullQuote.project?.postalCode ?? null,
    },
    lines: fullQuote.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity ?? 1,
      unitPriceHT: line.unitPriceHT ?? '0',
      tvaRate: line.tvaRate ?? '0',
      totalHT: line.totalHT ?? '0',
      clientOwned: line.clientOwned ?? false,
    })),
  };
}

// Render a quote PDF from its id. Shared by the JWT API route and the
// session-authenticated backoffice route so the admin preview works without
// an Authorization header.
export async function generateQuotePdfById(
  id: string,
  userId: string,
  userRole: string,
): Promise<{ pdfBytes: Uint8Array; number: string }> {
  const fullQuote = await getQuoteWithProjectDetails(id, userId, userRole);
  const pdfBytes = await renderQuoteDocumentPdf(toQuotePdfInput(fullQuote));
  return { pdfBytes, number: fullQuote.number ?? '' };
}

export async function sendQuote(
  id: string,
  userId: string,
  userRole: string,
  options: SendQuoteOptions = {},
) {
  // Fetch the full quote (project + client + lines) so we can render the PDF
  // and the email in one DB roundtrip.
  const fullQuote = await getQuoteWithProjectDetails(id, userId, userRole);

  if (!fullQuote.client?.email) {
    throw new Error("Le client n'a pas d'adresse email");
  }

  // Render the PDF (editable HTML template → Playwright, legacy pdf-lib fallback)
  const pdfBytes = await renderQuoteDocumentPdf(toQuotePdfInput(fullQuote));

  // Render the email body from the editable template
  const { subject, html } = await renderQuoteEmail({
    clientFirstName: fullQuote.client.firstName ?? '',
    clientLastName: fullQuote.client.lastName ?? '',
    quoteNumber: fullQuote.number ?? '',
    totalTTC: parseFloat(fullQuote.totalTTC ?? '0'),
    validUntil: fullQuote.validUntil ?? null,
    customMessage: options.customMessage,
    salesPersonName: options.salesPersonName,
  });

  // Convert PDF to base64 for Resend attachment
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  const emailResult = await sendEmail({
    to: fullQuote.client.email,
    subject,
    html,
    tag: 'quote-sent',
    attachments: [
      {
        filename: `devis-${fullQuote.number}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  });

  // Mark the quote as sent only after a successful delivery handoff
  await db
    .update(quotes)
    .set({
      status: 'envoye',
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, id));

  return {
    message: `Devis envoyé à ${fullQuote.client.email}`,
    sentTo: fullQuote.client.email,
    emailId: emailResult.id,
    provider: emailResult.provider,
  };
}

export async function getQuoteWithProjectDetails(id: string, userId: string, userRole: string) {
  await verifyQuoteAccess(id, userId, userRole);

  const [quote] = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      validUntil: quotes.validUntil,
      totalHT: quotes.totalHT,
      totalTVA: quotes.totalTVA,
      totalTTC: quotes.totalTTC,
      discount: quotes.discount,
      promoCode: quotes.promoCode,
      promoDiscount: quotes.promoDiscount,
      notes: quotes.notes,
      createdAt: quotes.createdAt,
      project: {
        id: projects.id,
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
    .where(eq(quotes.id, id))
    .limit(1);

  const lines = await db
    .select()
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, id))
    .orderBy(quoteLines.sortOrder);

  return {
    ...quote,
    lines,
  };
}
