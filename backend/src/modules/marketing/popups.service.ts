import { eq, and, desc, lte, gte, or, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import { popups, promoCodes, type Popup } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import type { PopupInput } from './marketing.schema';

export async function listPopups(): Promise<Popup[]> {
  return db.select().from(popups).orderBy(desc(popups.priority), desc(popups.createdAt));
}

export async function getPopup(id: string): Promise<Popup> {
  const [row] = await db.select().from(popups).where(eq(popups.id, id)).limit(1);
  if (!row) throw new NotFoundError('Pop-up');
  return row;
}

function toValues(input: PopupInput) {
  return {
    title: input.title,
    body: input.body,
    imageUrl: input.imageUrl ?? null,
    ctaLabel: input.ctaLabel ?? null,
    ctaUrl: input.ctaUrl ?? null,
    promoCodeId: input.promoCodeId ?? null,
    active: input.active,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    delaySeconds: input.delaySeconds,
    frequency: input.frequency,
    priority: input.priority,
  };
}

export async function createPopup(input: PopupInput): Promise<Popup> {
  const [row] = await db.insert(popups).values(toValues(input)).returning();
  return row!;
}

export async function updatePopup(id: string, input: PopupInput): Promise<Popup> {
  await getPopup(id);
  const [row] = await db
    .update(popups)
    .set({ ...toValues(input), updatedAt: new Date() })
    .where(eq(popups.id, id))
    .returning();
  return row!;
}

export async function deletePopup(id: string): Promise<void> {
  await getPopup(id);
  await db.delete(popups).where(eq(popups.id, id));
}

/**
 * Pop-up à afficher publiquement : active, dans sa fenêtre de validité.
 * Le code promo lié (si présent) est résolu pour l'afficher dans la modale.
 */
export async function getActivePopup(now: Date = new Date()) {
  const [row] = await db
    .select()
    .from(popups)
    .where(
      and(
        eq(popups.active, true),
        or(isNull(popups.startsAt), lte(popups.startsAt, now)),
        or(isNull(popups.endsAt), gte(popups.endsAt, now)),
      ),
    )
    .orderBy(desc(popups.priority), desc(popups.createdAt))
    .limit(1);

  if (!row) return null;

  let promoCode: string | null = null;
  if (row.promoCodeId) {
    const [promo] = await db
      .select({ code: promoCodes.code, active: promoCodes.active })
      .from(promoCodes)
      .where(eq(promoCodes.id, row.promoCodeId))
      .limit(1);
    if (promo?.active) promoCode = promo.code;
  }

  return { ...row, promoCode };
}
