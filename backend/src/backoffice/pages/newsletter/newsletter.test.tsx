import { describe, expect, it } from 'bun:test';
import { NewsletterPage } from './list';
import { CampaignPage } from './campaign';
import type { AdminUser } from '../../middleware/admin-auth';
import type { ReleaseWithEntries } from '../../../modules/newsletter';
import type { EmailCampaign } from '../../../db/schema';

const adminUser: AdminUser = {
  id: 'u1',
  email: 'admin@neo-domotique.fr',
  firstName: 'Admin',
  lastName: 'Neo',
  role: 'admin',
};

const release: ReleaseWithEntries = {
  id: 'r1',
  version: '2.0.0',
  title: 'Refonte',
  description: null,
  status: 'brouillon',
  releasedAt: null,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
  entries: [
    {
      id: 'e1',
      releaseId: 'r1',
      title: 'Nouveau dashboard',
      description: 'Un dashboard repense.',
      category: 'nouveaute',
      isHighlight: true,
      sortOrder: 0,
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
    },
  ],
};

async function renderNode(node: unknown): Promise<string> {
  const renderable = node as { toString(): Promise<string> | string };
  return String(await renderable.toString());
}

describe('NewsletterPage', () => {
  it('affiche une case a cocher par nouveaute (name=entryIds)', async () => {
    const html = await renderNode(
      NewsletterPage({
        releases: [release],
        campaigns: [],
        eligibleCount: 42,
        user: adminUser,
      })
    );
    expect(html).toContain('name="entryIds"');
    expect(html).toContain('value="e1"');
    expect(html).toContain('Nouveau dashboard');
    expect(html).toContain('42 clients');
  });

  it('expose le bouton de generation IA qui poste vers /preview', async () => {
    const html = await renderNode(
      NewsletterPage({
        releases: [release],
        campaigns: [],
        eligibleCount: 1,
        user: adminUser,
      })
    );
    expect(html).toContain('action="/backoffice/newsletter/preview"');
    // L'apostrophe est echappee par le moteur JSX (l&#39;apercu).
    expect(html).toContain('Generer l');
    expect(html).toContain('apercu de l');
  });

  it('ne contient aucun formulaire imbrique (HTML invalide)', async () => {
    const html = await renderNode(
      NewsletterPage({
        releases: [release],
        campaigns: [],
        eligibleCount: 1,
        user: adminUser,
      })
    );
    // Verifie qu'aucun <form> ne s'ouvre avant la fermeture d'un autre <form>.
    let depth = 0;
    const tokens = html.match(/<form\b|<\/form>/g) ?? [];
    for (const token of tokens) {
      if (token === '</form>') {
        depth -= 1;
      } else {
        depth += 1;
        expect(depth).toBeLessThanOrEqual(1);
      }
    }
    expect(depth).toBe(0);
  });
});

const sentCampaign: EmailCampaign = {
  id: 'camp1',
  subject: 'Nos nouveautes',
  html: '<p>corps de campagne</p>',
  status: 'envoyee',
  selectedEntryIds: ['e1'],
  totalRecipients: 100,
  sentCount: 98,
  openedCount: 49,
  createdBy: 'Admin Neo',
  sentAt: new Date('2026-06-02T00:00:00Z'),
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-02T00:00:00Z'),
};

const draftCampaign: EmailCampaign = {
  ...sentCampaign,
  id: 'camp2',
  status: 'brouillon',
  totalRecipients: 0,
  sentCount: 0,
  openedCount: 0,
  sentAt: null,
};

describe('CampaignPage', () => {
  it('affiche les stats et le taux d ouverture quand envoyee', async () => {
    const html = await renderNode(
      CampaignPage({
        campaign: sentCampaign,
        recipients: [],
        openRate: 50,
        eligibleCount: 100,
        user: adminUser,
      })
    );
    // "Taux d'ouverture" : apostrophe echappee en HTML.
    expect(html).toContain('Taux d');
    expect(html).toContain('ouverture');
    expect(html).toContain('50%');
    expect(html).toContain('srcdoc');
  });

  it('affiche le bouton d envoi et l editeur seulement en brouillon', async () => {
    const html = await renderNode(
      CampaignPage({
        campaign: draftCampaign,
        recipients: [],
        openRate: 0,
        eligibleCount: 100,
        user: adminUser,
      })
    );
    expect(html).toContain('/backoffice/newsletter/campaign/camp2/send');
    expect(html).toContain('Envoyer la campagne');
    expect(html).toContain('name="subject"');
    expect(html).toContain('name="html"');
  });

  it('masque l editeur quand la campagne est envoyee', async () => {
    const html = await renderNode(
      CampaignPage({
        campaign: sentCampaign,
        recipients: [],
        openRate: 50,
        eligibleCount: 100,
        user: adminUser,
      })
    );
    expect(html).not.toContain('Envoyer la campagne');
    expect(html).not.toContain('name="html"');
  });
});
