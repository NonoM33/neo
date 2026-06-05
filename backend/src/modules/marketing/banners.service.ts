import { eq, and, desc, lte, gte, or, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import { banners, type Banner } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import type { BannerInput } from './marketing.schema';

export async function listBanners(): Promise<Banner[]> {
  return db.select().from(banners).orderBy(desc(banners.priority), desc(banners.createdAt));
}

export async function getBanner(id: string): Promise<Banner> {
  const [row] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  if (!row) throw new NotFoundError('Bannière');
  return row;
}

function toValues(input: BannerInput) {
  return {
    message: input.message,
    linkUrl: input.linkUrl ?? null,
    linkLabel: input.linkLabel ?? null,
    bgColor: input.bgColor,
    textColor: input.textColor,
    dismissible: input.dismissible,
    active: input.active,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    priority: input.priority,
  };
}

export async function createBanner(input: BannerInput): Promise<Banner> {
  const [row] = await db.insert(banners).values(toValues(input)).returning();
  return row!;
}

export async function updateBanner(id: string, input: BannerInput): Promise<Banner> {
  await getBanner(id);
  const [row] = await db
    .update(banners)
    .set({ ...toValues(input), updatedAt: new Date() })
    .where(eq(banners.id, id))
    .returning();
  return row!;
}

export async function deleteBanner(id: string): Promise<void> {
  await getBanner(id);
  await db.delete(banners).where(eq(banners.id, id));
}

/** Bannière à afficher publiquement : active, dans sa fenêtre de validité, prioritaire. */
export async function getActiveBanner(now: Date = new Date()): Promise<Banner | null> {
  const [row] = await db
    .select()
    .from(banners)
    .where(
      and(
        eq(banners.active, true),
        or(isNull(banners.startsAt), lte(banners.startsAt, now)),
        or(isNull(banners.endsAt), gte(banners.endsAt, now)),
      ),
    )
    .orderBy(desc(banners.priority), desc(banners.createdAt))
    .limit(1);
  return row ?? null;
}
