import { eq, and, count, desc, sql, or } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  promoCodes,
  promoRedemptions,
  type PromoCode,
} from '../../db/schema';
import { NotFoundError, ConflictError, BadRequestError } from '../../lib/errors';
import {
  evaluatePromoCode,
  PROMO_REJECTION_MESSAGES,
} from './promo-codes.logic';
import type { CreatePromoCodeInput, UpdatePromoCodeInput } from './marketing.schema';

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function getPromoCode(id: string): Promise<PromoCode> {
  const [row] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  if (!row) throw new NotFoundError('Code promo');
  return row;
}

export async function findPromoByCode(code: string): Promise<PromoCode | undefined> {
  const [row] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, normalizeCode(code)))
    .limit(1);
  return row;
}

export async function createPromoCode(input: CreatePromoCodeInput): Promise<PromoCode> {
  const code = normalizeCode(input.code);
  const existing = await findPromoByCode(code);
  if (existing) throw new ConflictError('Ce code promo existe déjà');

  const [row] = await db
    .insert(promoCodes)
    .values({
      code,
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue.toFixed(2),
      minOrderHT: input.minOrderHT !== undefined ? input.minOrderHT.toFixed(2) : null,
      maxUses: input.maxUses ?? null,
      perClientOnce: input.perClientOnce,
      active: input.active,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();
  return row!;
}

export async function updatePromoCode(
  id: string,
  input: UpdatePromoCodeInput,
): Promise<PromoCode> {
  await getPromoCode(id);

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.description !== undefined) updateData.description = input.description;
  if (input.discountType !== undefined) updateData.discountType = input.discountType;
  if (input.discountValue !== undefined) updateData.discountValue = input.discountValue.toFixed(2);
  if (input.minOrderHT !== undefined)
    updateData.minOrderHT = input.minOrderHT === null ? null : input.minOrderHT.toFixed(2);
  if (input.maxUses !== undefined) updateData.maxUses = input.maxUses;
  if (input.perClientOnce !== undefined) updateData.perClientOnce = input.perClientOnce;
  if (input.active !== undefined) updateData.active = input.active;
  if (input.startsAt !== undefined) updateData.startsAt = input.startsAt;
  if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt;

  const [row] = await db
    .update(promoCodes)
    .set(updateData)
    .where(eq(promoCodes.id, id))
    .returning();
  return row!;
}

export async function deletePromoCode(id: string): Promise<void> {
  await getPromoCode(id);
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
}

async function countClientRedemptions(
  promoCodeId: string,
  email?: string,
  clientId?: string,
): Promise<number> {
  if (!email && !clientId) return 0;
  const filters = [eq(promoRedemptions.promoCodeId, promoCodeId)];
  const identity = [];
  if (email) identity.push(eq(promoRedemptions.email, email.toLowerCase()));
  if (clientId) identity.push(eq(promoRedemptions.clientId, clientId));
  const [res] = await db
    .select({ total: count() })
    .from(promoRedemptions)
    .where(and(filters[0]!, or(...identity)!));
  return res?.total ?? 0;
}

export interface ValidatedPromo {
  promo: PromoCode;
  discountAmount: number;
}

/**
 * Valide un code promo pour un total HT donné et renvoie la remise calculée.
 * Lève une BadRequestError lisible si le code est introuvable ou inapplicable.
 */
export async function validatePromoForOrder(
  code: string,
  totalHT: number,
  identity?: { email?: string; clientId?: string },
): Promise<ValidatedPromo> {
  const promo = await findPromoByCode(code);
  if (!promo) throw new BadRequestError('Code promo introuvable');

  const clientRedemptions = promo.perClientOnce
    ? await countClientRedemptions(promo.id, identity?.email, identity?.clientId)
    : 0;

  const result = evaluatePromoCode(promo, {
    totalHT,
    now: new Date(),
    clientRedemptions,
  });

  if (!result.valid) {
    throw new BadRequestError(PROMO_REJECTION_MESSAGES[result.reason]);
  }

  return { promo, discountAmount: result.discountAmount };
}

/**
 * Enregistre l'utilisation d'un code promo (redemption) et incrémente le
 * compteur global de façon atomique. Appelé quand un devis est créé/mis à jour
 * avec un code promo appliqué.
 */
export async function recordRedemption(params: {
  promoCodeId: string;
  quoteId?: string;
  clientId?: string;
  email?: string;
  discountAmount: number;
}): Promise<void> {
  await db.insert(promoRedemptions).values({
    promoCodeId: params.promoCodeId,
    quoteId: params.quoteId ?? null,
    clientId: params.clientId ?? null,
    email: params.email ? params.email.toLowerCase() : null,
    discountAmount: params.discountAmount.toFixed(2),
  });
  await db
    .update(promoCodes)
    .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
    .where(eq(promoCodes.id, params.promoCodeId));
}

/** Stats d'utilisation simples pour l'affichage CRM. */
export async function getPromoCodeStats(id: string) {
  const promo = await getPromoCode(id);
  const [agg] = await db
    .select({
      redemptions: count(),
      totalDiscount: sql<string>`COALESCE(SUM(${promoRedemptions.discountAmount}), 0)`,
    })
    .from(promoRedemptions)
    .where(eq(promoRedemptions.promoCodeId, id));
  return {
    promo,
    redemptions: agg?.redemptions ?? 0,
    totalDiscount: agg?.totalDiscount ?? '0',
  };
}
