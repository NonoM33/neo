import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac.middleware';
import { NotFoundError } from '../../lib/errors';
import * as changelogService from './changelog.service';
import * as campaignService from './campaign.service';
import * as releaseNotify from './release.notify';
import * as changelogMarkdown from './changelog.markdown';

const newsletterRoutes = new Hono();

newsletterRoutes.use('*', authMiddleware, requireAdmin());

const createReleaseSchema = z.object({
  version: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
});

const createEntrySchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1),
  category: z.enum(['nouveaute', 'amelioration', 'correction']).default('nouveaute'),
  isHighlight: z.boolean().default(false),
});

const previewSchema = z.object({
  selectedEntryIds: z.array(z.string().uuid()).min(1),
});

const updateCampaignSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  html: z.string().min(1),
});

// ── Releases / changelog ────────────────────────────────────────────────────
newsletterRoutes.get('/releases', async (c) => {
  const releases = await changelogService.listReleasesWithEntries();
  return c.json(releases);
});

newsletterRoutes.get('/releases/published', async (c) => {
  const releases = await changelogService.listPublishedReleasesWithEntries();
  return c.json(releases);
});

newsletterRoutes.post('/releases', zValidator('json', createReleaseSchema), async (c) => {
  const input = c.req.valid('json');
  const release = await changelogService.createRelease(input);
  return c.json(release, 201);
});

newsletterRoutes.post(
  '/releases/:id/entries',
  zValidator('json', createEntrySchema),
  async (c) => {
    const releaseId = c.req.param('id');
    const input = c.req.valid('json');
    const entry = await changelogService.createEntry({ releaseId, ...input });
    return c.json(entry, 201);
  }
);

// Publie une release : statut "publiee" + annonce Mattermost (best-effort) +
// régénération du CHANGELOG.md depuis les releases publiées.
newsletterRoutes.post('/releases/:id/publish', async (c) => {
  const releaseId = c.req.param('id');
  const release = await changelogService.getReleaseWithEntries(releaseId);
  if (!release) throw new NotFoundError('Release introuvable');

  await changelogService.publishRelease(releaseId);

  const published = await changelogService.getReleaseWithEntries(releaseId);
  if (published) await releaseNotify.notifyReleasePublished(published);
  const allPublished = await changelogService.listPublishedReleasesWithEntries();
  await changelogMarkdown.writeChangelogFile(allPublished);

  return c.json({ success: true });
});

newsletterRoutes.delete('/releases/:id', async (c) => {
  await changelogService.deleteRelease(c.req.param('id'));
  const allPublished = await changelogService.listPublishedReleasesWithEntries();
  await changelogMarkdown.writeChangelogFile(allPublished);
  return c.json({ success: true });
});

newsletterRoutes.delete('/entries/:id', async (c) => {
  await changelogService.deleteEntry(c.req.param('id'));
  return c.json({ success: true });
});

// ── Campagnes ────────────────────────────────────────────────────────────────
newsletterRoutes.get('/eligible-count', async (c) => {
  const count = await campaignService.countEligibleRecipients();
  return c.json({ count });
});

newsletterRoutes.get('/campaigns', async (c) => {
  const campaigns = await campaignService.listCampaigns();
  return c.json(campaigns);
});

// Génère un brouillon de campagne (rédaction IA) à partir des entrées cochées.
newsletterRoutes.post('/campaigns/preview', zValidator('json', previewSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');
  const campaign = await campaignService.createCampaignDraft({
    selectedEntryIds: input.selectedEntryIds,
    createdBy: user.email,
  });
  return c.json(campaign, 201);
});

newsletterRoutes.get('/campaigns/:id', async (c) => {
  const stats = await campaignService.getCampaignStats(c.req.param('id'));
  if (!stats) throw new NotFoundError('Campagne introuvable');
  return c.json(stats);
});

newsletterRoutes.put('/campaigns/:id', zValidator('json', updateCampaignSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  await campaignService.updateCampaignContent(id, input);
  const stats = await campaignService.getCampaignStats(id);
  if (!stats) throw new NotFoundError('Campagne introuvable');
  return c.json(stats);
});

newsletterRoutes.post('/campaigns/:id/send', async (c) => {
  const id = c.req.param('id');
  const result = await campaignService.sendCampaign(id);
  return c.json(result);
});

export { newsletterRoutes };
export default newsletterRoutes;
