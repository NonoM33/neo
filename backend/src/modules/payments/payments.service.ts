import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { payments, invoices, orders, quotes } from '../../db/schema';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { paginate, type PaginatedResult } from '../../lib/pagination';
import { getStripe } from './stripe.client';
import { computeAmountCents } from './payment.amount';
import { interpretStripeEvent } from './payment.webhook';
import { verifyPaymentToken } from './payment.token';
import type {
  CreatePaymentLinkInput,
  PaymentFilter,
  PaymentTargetType,
} from './payments.schema';
import type { Payment } from '../../db/schema/payments';

const TARGET_LABEL: Record<PaymentTargetType, string> = {
  invoice: 'Facture',
  order: 'Commande',
  quote_deposit: 'Acompte devis',
};

interface ResolvedTarget {
  totalTTC: string;
  projectId: string;
  number: string;
  settled: boolean;
}

/** Charge la cible (facture/commande/devis), son total TTC et son état de règlement. */
async function resolveTarget(
  targetType: PaymentTargetType,
  targetId: string
): Promise<ResolvedTarget> {
  if (targetType === 'invoice') {
    const [row] = await db
      .select({
        totalTTC: invoices.totalTTC,
        projectId: invoices.projectId,
        number: invoices.number,
        status: invoices.status,
      })
      .from(invoices)
      .where(eq(invoices.id, targetId))
      .limit(1);
    if (!row) throw new NotFoundError('Facture');
    return { ...row, settled: row.status === 'payee' };
  }

  if (targetType === 'order') {
    const [row] = await db
      .select({
        totalTTC: orders.totalTTC,
        projectId: orders.projectId,
        number: orders.number,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, targetId))
      .limit(1);
    if (!row) throw new NotFoundError('Commande');
    return { ...row, settled: row.status === 'payee' };
  }

  // quote_deposit
  const [row] = await db
    .select({
      totalTTC: quotes.totalTTC,
      projectId: quotes.projectId,
      number: quotes.number,
    })
    .from(quotes)
    .where(eq(quotes.id, targetId))
    .limit(1);
  if (!row) throw new NotFoundError('Devis');
  // Un acompte n'a pas d'état "réglé" propre côté devis ; on s'appuie sur les
  // paiements existants (cf. createPaymentLink) pour éviter un double encaissement.
  return { ...row, settled: false };
}

/**
 * Crée (ou réutilise) un lien de paiement pour une cible. Idempotent : si un
 * paiement en cours existe déjà pour cette cible, il est renvoyé tel quel.
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput,
  userId: string | null
): Promise<Payment> {
  const target = await resolveTarget(input.targetType, input.targetId);
  if (target.settled) {
    throw new ValidationError('Cette cible est déjà réglée');
  }

  const existing = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.targetType, input.targetType),
        eq(payments.targetId, input.targetId)
      )
    )
    .orderBy(desc(payments.createdAt));

  if (existing.some((p) => p.status === 'succeeded')) {
    throw new ValidationError('Cette cible a déjà été payée');
  }
  const reusable = existing.find(
    (p) => p.status === 'pending' || p.status === 'processing'
  );
  if (reusable) return reusable;

  const amountCents = computeAmountCents({
    targetType: input.targetType,
    totalTTC: target.totalTTC,
    depositPercent: input.depositPercent,
  });

  const [created] = await db
    .insert(payments)
    .values({
      targetType: input.targetType,
      targetId: input.targetId,
      projectId: target.projectId,
      amountCents,
      currency: 'eur',
      status: 'pending',
      description: `${TARGET_LABEL[input.targetType]} ${target.number}`,
      createdBy: userId,
    })
    .returning();

  if (!created) throw new ValidationError('Échec de création du paiement');
  return created;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const [row] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return row ?? null;
}

/** Vérifie un jeton public signé et charge le paiement associé. */
export async function verifyAndLoad(
  token: string
): Promise<{ payment: Payment } | null> {
  const verified = await verifyPaymentToken(token);
  if (!verified) return null;
  const payment = await getPaymentById(verified.paymentId);
  if (!payment) return null;
  return { payment };
}

/**
 * Crée une session Stripe Checkout pour ce paiement et renvoie l'URL hébergée.
 * `origin` est la base publique du backend (ex. https://api.exemple.fr) et
 * `token` le jeton public signé, réinjecté dans les URLs de retour.
 */
export async function createCheckoutSession(
  payment: Payment,
  origin: string,
  token: string
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: payment.currency,
          unit_amount: payment.amountCents,
          product_data: { name: payment.description ?? 'Paiement Neo Domotique' },
        },
      },
    ],
    success_url: `${origin}/payer/${token}?done=1`,
    cancel_url: `${origin}/payer/${token}?canceled=1`,
    metadata: { paymentId: payment.id },
    locale: 'fr',
  });

  await db
    .update(payments)
    .set({
      stripeCheckoutSessionId: session.id,
      status: 'processing',
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  if (!session.url) {
    throw new ValidationError('Stripe n\'a pas renvoyé d\'URL de paiement');
  }
  return session.url;
}

/** Applique le règlement à la cible (idempotent au niveau cible). */
async function settleTarget(payment: Payment): Promise<void> {
  const now = new Date();
  if (payment.targetType === 'invoice') {
    await db
      .update(invoices)
      .set({ status: 'payee', paidAt: now, paymentMethod: 'stripe', updatedAt: now })
      .where(
        and(
          eq(invoices.id, payment.targetId),
          inArray(invoices.status, ['brouillon', 'envoyee'])
        )
      );
    return;
  }
  if (payment.targetType === 'order') {
    await db
      .update(orders)
      .set({ status: 'payee', paidAt: now, updatedAt: now })
      .where(
        and(
          eq(orders.id, payment.targetId),
          inArray(orders.status, ['en_attente', 'confirmee'])
        )
      );
    return;
  }
  // quote_deposit : l'acompte vaut acceptation du devis.
  await db
    .update(quotes)
    .set({ status: 'accepte', updatedAt: now })
    .where(
      and(eq(quotes.id, payment.targetId), inArray(quotes.status, ['brouillon', 'envoye']))
    );
}

/** Best-effort : récupère l'URL du reçu Stripe depuis le PaymentIntent. */
async function fetchReceiptUrl(paymentIntentId: string | null): Promise<string | null> {
  if (!paymentIntentId) return null;
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
    const charge = pi.latest_charge;
    if (charge && typeof charge !== 'string') {
      return charge.receipt_url ?? null;
    }
  } catch {
    // Pas bloquant : le reçu est un confort, pas une preuve de paiement.
  }
  return null;
}

/**
 * Vérifie la signature Stripe puis applique l'événement. Idempotent : un
 * paiement déjà `succeeded` n'est pas retraité. Renvoie le type d'action.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | undefined,
  webhookSecret: string | undefined
): Promise<{ handled: string }> {
  if (!webhookSecret) throw new ValidationError('Webhook Stripe non configuré');
  if (!signature) throw new ValidationError('Signature Stripe manquante');

  const stripe = getStripe();
  // constructEventAsync : compatible Bun/edge (HMAC via WebCrypto).
  const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  const outcome = interpretStripeEvent(event as never);
  if (outcome.kind === 'ignored') return { handled: 'ignored' };

  const sessionObject = (event.data.object ?? {}) as { metadata?: { paymentId?: string } };
  const paymentId = sessionObject.metadata?.paymentId;

  const [bySession] = await db
    .select()
    .from(payments)
    .where(eq(payments.stripeCheckoutSessionId, outcome.sessionId))
    .limit(1);
  const payment =
    bySession ?? (paymentId ? await getPaymentById(paymentId) : null);
  if (!payment) return { handled: 'unknown_payment' };

  if (outcome.kind === 'paid') {
    if (payment.status === 'succeeded') return { handled: 'already_succeeded' };
    const receiptUrl = await fetchReceiptUrl(outcome.paymentIntentId);
    await db
      .update(payments)
      .set({
        status: 'succeeded',
        paidAt: new Date(),
        stripePaymentIntentId: outcome.paymentIntentId,
        customerEmail: outcome.customerEmail,
        receiptUrl,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
    await settleTarget(payment);
    return { handled: 'paid' };
  }

  if (outcome.kind === 'failed') {
    await db
      .update(payments)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), sql`${payments.status} <> 'succeeded'`));
    return { handled: 'failed' };
  }

  // expired
  await db
    .update(payments)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(and(eq(payments.id, payment.id), sql`${payments.status} <> 'succeeded'`));
  return { handled: 'expired' };
}

export async function listPayments(
  filter: PaymentFilter
): Promise<PaginatedResult<Payment>> {
  const conditions = [];
  if (filter.status) conditions.push(eq(payments.status, filter.status));
  if (filter.targetType) conditions.push(eq(payments.targetType, filter.targetType));
  if (filter.targetId) conditions.push(eq(payments.targetId, filter.targetId));
  if (filter.projectId) conditions.push(eq(payments.projectId, filter.projectId));
  const where = conditions.length ? and(...conditions) : undefined;

  const offset = (filter.page - 1) * filter.pageSize;
  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(payments)
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(filter.pageSize)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(payments).where(where),
  ]);

  const total = countRows[0]?.count ?? 0;
  return paginate(rows, total, { page: filter.page, limit: filter.pageSize });
}
