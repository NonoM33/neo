import { eq, desc, isNotNull } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  marketingCampaigns,
  marketingCampaignRecipients,
  emailOptOuts,
  clients,
  leads,
  promoCodes,
  type MarketingCampaign,
} from '../../db/schema';
import { NotFoundError, BadRequestError } from '../../lib/errors';
import { sendEmail } from '../email';
import type { CampaignInput } from './marketing.schema';

export async function listCampaigns(): Promise<MarketingCampaign[]> {
  return db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
}

export async function getCampaign(id: string): Promise<MarketingCampaign> {
  const [row] = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('Campagne');
  return row;
}

export async function getCampaignRecipients(id: string) {
  await getCampaign(id);
  return db
    .select()
    .from(marketingCampaignRecipients)
    .where(eq(marketingCampaignRecipients.campaignId, id))
    .orderBy(desc(marketingCampaignRecipients.createdAt));
}

export async function createCampaign(
  input: CampaignInput,
  createdBy?: string,
): Promise<MarketingCampaign> {
  const [row] = await db
    .insert(marketingCampaigns)
    .values({
      name: input.name,
      subject: input.subject,
      html: input.html,
      audience: input.audience,
      customEmails: input.customEmails,
      promoCodeId: input.promoCodeId ?? null,
      scheduledAt: input.scheduledAt ?? null,
      status: input.scheduledAt ? 'programmee' : 'brouillon',
      createdBy,
    })
    .returning();
  return row!;
}

export async function updateCampaign(
  id: string,
  input: CampaignInput,
): Promise<MarketingCampaign> {
  const existing = await getCampaign(id);
  if (existing.status === 'envoyee' || existing.status === 'envoi') {
    throw new BadRequestError('Une campagne envoyée ne peut plus être modifiée');
  }
  const [row] = await db
    .update(marketingCampaigns)
    .set({
      name: input.name,
      subject: input.subject,
      html: input.html,
      audience: input.audience,
      customEmails: input.customEmails,
      promoCodeId: input.promoCodeId ?? null,
      scheduledAt: input.scheduledAt ?? null,
      status: input.scheduledAt ? 'programmee' : 'brouillon',
      updatedAt: new Date(),
    })
    .where(eq(marketingCampaigns.id, id))
    .returning();
  return row!;
}

export async function deleteCampaign(id: string): Promise<void> {
  await getCampaign(id);
  await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
}

/** Résout la liste {email, clientId?} de l'audience, dédupliquée et sans opt-out. */
async function resolveAudience(
  campaign: MarketingCampaign,
): Promise<{ email: string; clientId: string | null }[]> {
  const collected = new Map<string, string | null>();

  if (campaign.audience === 'clients') {
    const rows = await db
      .select({ email: clients.email, id: clients.id })
      .from(clients)
      .where(isNotNull(clients.email));
    for (const r of rows) if (r.email) collected.set(r.email.toLowerCase(), r.id);
  } else if (campaign.audience === 'leads') {
    const rows = await db
      .select({ email: leads.email })
      .from(leads)
      .where(isNotNull(leads.email));
    for (const r of rows) if (r.email) collected.set(r.email.toLowerCase(), null);
  } else {
    for (const e of campaign.customEmails) collected.set(e.toLowerCase(), null);
  }

  // Exclure les désinscrits.
  const optOuts = await db.select({ email: emailOptOuts.email }).from(emailOptOuts);
  for (const o of optOuts) collected.delete(o.email.toLowerCase());

  return [...collected.entries()].map(([email, clientId]) => ({ email, clientId }));
}

/** Injecte le code promo de la campagne dans le HTML via le token {{promoCode}}. */
async function renderCampaignHtml(campaign: MarketingCampaign): Promise<string> {
  if (!campaign.promoCodeId) return campaign.html;
  const [promo] = await db
    .select({ code: promoCodes.code })
    .from(promoCodes)
    .where(eq(promoCodes.id, campaign.promoCodeId))
    .limit(1);
  if (!promo) return campaign.html;
  return campaign.html.replaceAll('{{promoCode}}', promo.code);
}

export interface SendCampaignResult {
  totalRecipients: number;
  sentCount: number;
  failed: number;
}

/**
 * Envoie une campagne à son audience. Idempotence simple : on refuse de
 * renvoyer une campagne déjà envoyée. L'envoi se fait séquentiellement et
 * chaque destinataire est tracé (statut envoye/echec).
 */
export async function sendCampaign(id: string): Promise<SendCampaignResult> {
  const campaign = await getCampaign(id);
  if (campaign.status === 'envoyee') {
    throw new BadRequestError('Cette campagne a déjà été envoyée');
  }

  const audience = await resolveAudience(campaign);
  if (audience.length === 0) {
    throw new BadRequestError('Aucun destinataire pour cette audience');
  }

  const html = await renderCampaignHtml(campaign);

  await db
    .update(marketingCampaigns)
    .set({ status: 'envoi', totalRecipients: audience.length, updatedAt: new Date() })
    .where(eq(marketingCampaigns.id, id));

  // Repart d'un suivi propre (cas d'un renvoi après échec partiel).
  await db
    .delete(marketingCampaignRecipients)
    .where(eq(marketingCampaignRecipients.campaignId, id));

  let sentCount = 0;
  let failed = 0;

  for (const target of audience) {
    try {
      await sendEmail({
        to: target.email,
        subject: campaign.subject,
        html,
        tag: 'marketing-campaign',
      });
      await db.insert(marketingCampaignRecipients).values({
        campaignId: id,
        clientId: target.clientId,
        email: target.email,
        status: 'envoye',
        sentAt: new Date(),
      });
      sentCount += 1;
    } catch (err) {
      await db.insert(marketingCampaignRecipients).values({
        campaignId: id,
        clientId: target.clientId,
        email: target.email,
        status: 'echec',
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
      failed += 1;
    }
  }

  await db
    .update(marketingCampaigns)
    .set({
      status: failed === audience.length ? 'echec' : 'envoyee',
      sentCount,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketingCampaigns.id, id));

  return { totalRecipients: audience.length, sentCount, failed };
}
