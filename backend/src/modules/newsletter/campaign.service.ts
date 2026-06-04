import { randomBytes } from 'node:crypto';
import { desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { env } from '../../config/env';
import {
  clients,
  emailCampaigns,
  emailCampaignRecipients,
  emailOptOuts,
  type EmailCampaign,
  type EmailCampaignRecipient,
} from '../../db/schema';
import { sendEmail } from '../email/email.service';
import {
  getEntriesByIds,
  getReleasesByIds,
  groupSelectedEntriesByRelease,
  type ReleaseWithEntries,
} from './changelog.service';
import { draftCampaignHtml } from './email.ai.service';
import { personalizeHtml } from './email.composer';

// ---------------------------------------------------------------------------
// Logique pure (testable sans base)
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | null | undefined): email is string {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

export interface RecipientCandidate {
  clientId: string;
  email: string;
}

// Construit la liste finale : email valide, dedupliquee (insensible a la
// casse), en excluant les desinscrits.
export function buildRecipientCandidates(
  clientRows: { id: string; email: string | null }[],
  optOutEmails: string[]
): RecipientCandidate[] {
  const optedOut = new Set(optOutEmails.map((e) => e.toLowerCase().trim()));
  const seen = new Set<string>();
  const result: RecipientCandidate[] = [];

  for (const row of clientRows) {
    if (!isValidEmail(row.email)) continue;
    const normalized = row.email.toLowerCase().trim();
    if (optedOut.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({ clientId: row.id, email: row.email.trim() });
  }

  return result;
}

export function computeOpenRate(
  sentCount: number,
  openedCount: number
): number {
  if (sentCount <= 0) return 0;
  return Math.round((openedCount / sentCount) * 1000) / 10;
}

export function buildPixelUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/track/open/${token}.png`;
}

export function buildUnsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/track/unsubscribe/${token}`;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Creation de campagne (brouillon) + redaction IA
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  selectedEntryIds: string[];
  createdBy?: string;
}

// A partir des seuls ids d'entrees cochees, on reconstruit la vue groupee :
// on charge les entrees, on en deduit les releases concernees, puis on groupe.
async function loadGroupedFromEntryIds(
  entryIds: string[]
): Promise<ReleaseWithEntries[]> {
  const entryRows = await getEntriesByIds(entryIds);
  const releaseIds = [...new Set(entryRows.map((e) => e.releaseId))];
  const releaseRows = await getReleasesByIds(releaseIds);
  return groupSelectedEntriesByRelease(releaseRows, entryRows, entryIds);
}

export async function createCampaignDraft(
  input: CreateCampaignInput
): Promise<EmailCampaign> {
  const grouped = await loadGroupedFromEntryIds(input.selectedEntryIds);
  const { subject, html } = await draftCampaignHtml(grouped);

  const [created] = await db
    .insert(emailCampaigns)
    .values({
      subject,
      html,
      selectedEntryIds: input.selectedEntryIds,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return created!;
}

export async function getCampaign(
  campaignId: string
): Promise<EmailCampaign | undefined> {
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);
  return campaign;
}

export async function listCampaigns(): Promise<EmailCampaign[]> {
  return db
    .select()
    .from(emailCampaigns)
    .orderBy(desc(emailCampaigns.createdAt));
}

export interface UpdateCampaignContent {
  subject?: string;
  html?: string;
}

export async function updateCampaignContent(
  campaignId: string,
  content: UpdateCampaignContent
): Promise<void> {
  await db
    .update(emailCampaigns)
    .set({ ...content, updatedAt: new Date() })
    .where(eq(emailCampaigns.id, campaignId));
}

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------

async function loadCandidates(): Promise<RecipientCandidate[]> {
  const [clientRows, optOuts] = await Promise.all([
    db
      .select({ id: clients.id, email: clients.email })
      .from(clients)
      .where(isNotNull(clients.email)),
    db.select({ email: emailOptOuts.email }).from(emailOptOuts),
  ]);
  return buildRecipientCandidates(
    clientRows,
    optOuts.map((o) => o.email)
  );
}

export interface SendResult {
  totalRecipients: number;
  sent: number;
  failed: number;
}

// Envoie la campagne a tous les clients eligibles. Idempotent au niveau du
// statut : refuse une campagne deja en cours/envoyee.
export async function sendCampaign(campaignId: string): Promise<SendResult> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error('Campagne introuvable');
  if (campaign.status === 'envoi' || campaign.status === 'envoyee') {
    throw new Error('Campagne deja envoyee ou en cours d envoi');
  }

  const candidates = await loadCandidates();

  await db
    .update(emailCampaigns)
    .set({
      status: 'envoi',
      totalRecipients: candidates.length,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  let sent = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const token = generateToken();
    const [recipient] = await db
      .insert(emailCampaignRecipients)
      .values({
        campaignId,
        clientId: candidate.clientId,
        email: candidate.email,
        token,
      })
      .returning();

    const html = personalizeHtml(campaign.html, {
      pixelUrl: buildPixelUrl(env.PUBLIC_URL, token),
      unsubscribeUrl: buildUnsubscribeUrl(env.PUBLIC_URL, token),
    });

    try {
      await sendEmail({
        to: candidate.email,
        subject: campaign.subject,
        html,
        tag: `newsletter-${campaignId}`,
      });
      await db
        .update(emailCampaignRecipients)
        .set({ status: 'envoye', sentAt: new Date() })
        .where(eq(emailCampaignRecipients.id, recipient!.id));
      sent += 1;
    } catch (error) {
      await db
        .update(emailCampaignRecipients)
        .set({
          status: 'echec',
          error: error instanceof Error ? error.message : String(error),
        })
        .where(eq(emailCampaignRecipients.id, recipient!.id));
      failed += 1;
    }
  }

  await db
    .update(emailCampaigns)
    .set({
      status: failed === candidates.length && candidates.length > 0
        ? 'echec'
        : 'envoyee',
      sentCount: sent,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  return { totalRecipients: candidates.length, sent, failed };
}

// ---------------------------------------------------------------------------
// Tracking ouverture + desinscription
// ---------------------------------------------------------------------------

// Enregistre une ouverture (pixel). Premiere ouverture => statut 'ouvert' +
// incrementation du compteur de la campagne. Idempotent sur le statut.
export async function recordOpen(token: string): Promise<void> {
  const [recipient] = await db
    .select()
    .from(emailCampaignRecipients)
    .where(eq(emailCampaignRecipients.token, token))
    .limit(1);
  if (!recipient) return;

  const isFirstOpen = recipient.openedAt === null;

  await db
    .update(emailCampaignRecipients)
    .set({
      status: recipient.status === 'desinscrit' ? 'desinscrit' : 'ouvert',
      openedAt: recipient.openedAt ?? new Date(),
      openCount: sql`${emailCampaignRecipients.openCount} + 1`,
    })
    .where(eq(emailCampaignRecipients.id, recipient.id));

  if (isFirstOpen) {
    await db
      .update(emailCampaigns)
      .set({ openedCount: sql`${emailCampaigns.openedCount} + 1` })
      .where(eq(emailCampaigns.id, recipient.campaignId));
  }
}

export async function recordUnsubscribe(token: string): Promise<boolean> {
  const [recipient] = await db
    .select()
    .from(emailCampaignRecipients)
    .where(eq(emailCampaignRecipients.token, token))
    .limit(1);
  if (!recipient) return false;

  await db
    .update(emailCampaignRecipients)
    .set({ status: 'desinscrit' })
    .where(eq(emailCampaignRecipients.id, recipient.id));

  await db
    .insert(emailOptOuts)
    .values({
      email: recipient.email,
      clientId: recipient.clientId,
      reason: 'Lien de desinscription newsletter',
    })
    .onConflictDoNothing({ target: emailOptOuts.email });

  return true;
}

// ---------------------------------------------------------------------------
// Statistiques
// ---------------------------------------------------------------------------

export interface CampaignStats {
  campaign: EmailCampaign;
  openRate: number;
  recipients: EmailCampaignRecipient[];
}

export async function getCampaignStats(
  campaignId: string
): Promise<CampaignStats | undefined> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return undefined;

  const recipients = await db
    .select()
    .from(emailCampaignRecipients)
    .where(eq(emailCampaignRecipients.campaignId, campaignId))
    .orderBy(desc(emailCampaignRecipients.openedAt));

  return {
    campaign,
    openRate: computeOpenRate(campaign.sentCount, campaign.openedCount),
    recipients,
  };
}

export async function countEligibleRecipients(): Promise<number> {
  const candidates = await loadCandidates();
  return candidates.length;
}
