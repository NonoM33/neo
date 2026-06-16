import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Icon, Modal, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { newsletterService } from '../../services';
import {
  changelogCategoryLabels,
  campaignStatusLabels,
  releaseStatusLabels,
} from '../../types/newsletter.types';
import type {
  ChangelogCategory,
  EmailCampaign,
  ReleaseWithEntries,
} from '../../types/newsletter.types';

const CATEGORY_TONE: Record<ChangelogCategory, PillTone> = {
  nouveaute: 'info',
  amelioration: 'ochre',
  correction: 'success',
};

const CAMPAIGN_TONE: Record<EmailCampaign['status'], PillTone> = {
  brouillon: 'neutral',
  envoi: 'info',
  envoyee: 'success',
  echec: 'danger',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function NewsletterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [releases, setReleases] = useState<ReleaseWithEntries[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [releaseModal, setReleaseModal] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ version: '', title: '', description: '' });

  const [entryModal, setEntryModal] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({
    title: '',
    description: '',
    category: 'nouveaute' as ChangelogCategory,
    isHighlight: false,
  });

  const reload = async () => {
    const [rel, camp, count] = await Promise.all([
      newsletterService.listReleases(),
      newsletterService.listCampaigns(),
      newsletterService.getEligibleCount(),
    ]);
    setReleases(rel);
    setCampaigns(camp);
    setEligibleCount(count);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rel, camp, count] = await Promise.all([
          newsletterService.listReleases(),
          newsletterService.listCampaigns(),
          newsletterService.getEligibleCount(),
        ]);
        if (cancelled) return;
        setReleases(rel);
        setCampaigns(camp);
        setEligibleCount(count);
      } catch (error) {
        console.error('Failed to load newsletter data:', error);
        toast.error('Impossible de charger la newsletter');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEntry = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateRelease = async () => {
    if (!releaseForm.version.trim() || !releaseForm.title.trim()) {
      toast.error('Version et titre obligatoires');
      return;
    }
    try {
      await newsletterService.createRelease({
        version: releaseForm.version.trim(),
        title: releaseForm.title.trim(),
        description: releaseForm.description.trim() || undefined,
      });
      setReleaseModal(false);
      setReleaseForm({ version: '', title: '', description: '' });
      await reload();
      toast.success('Release créée');
    } catch {
      toast.error('Cette version existe déjà');
    }
  };

  const handleCreateEntry = async () => {
    if (!entryModal) return;
    if (!entryForm.title.trim() || !entryForm.description.trim()) {
      toast.error('Titre et description obligatoires');
      return;
    }
    try {
      await newsletterService.createEntry(entryModal, {
        title: entryForm.title.trim(),
        description: entryForm.description.trim(),
        category: entryForm.category,
        isHighlight: entryForm.isHighlight,
      });
      setEntryModal(null);
      setEntryForm({ title: '', description: '', category: 'nouveaute', isHighlight: false });
      await reload();
      toast.success('Nouveauté ajoutée');
    } catch {
      toast.error("Échec de l'ajout");
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm('Publier cette release ? (annonce Mattermost + CHANGELOG.md)')) return;
    try {
      await newsletterService.publishRelease(id);
      await reload();
      toast.success('Release publiée');
    } catch {
      toast.error('Échec de la publication');
    }
  };

  const handleDeleteRelease = async (id: string) => {
    if (!window.confirm('Supprimer cette release et ses nouveautés ?')) return;
    try {
      await newsletterService.deleteRelease(id);
      await reload();
      toast.success('Release supprimée');
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await newsletterService.deleteEntry(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await reload();
      toast.success('Nouveauté supprimée');
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  const handleGenerate = async () => {
    if (selected.size === 0) {
      toast.error('Cochez au moins une nouveauté');
      return;
    }
    setGenerating(true);
    try {
      const campaign = await newsletterService.createCampaignDraft([...selected]);
      toast.success('Brouillon généré par IA');
      navigate(`/newsletter/campaign/${campaign.id}`);
    } catch {
      toast.error('Échec de la génération');
      setGenerating(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="newsletter-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Newsletter</h1>
          <p>
            Cochez les nouveautés à annoncer, générez un email rédigé par l'IA, puis envoyez-le à
            vos {eligibleCount} clients avec suivi des ouvertures.
          </p>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="plus" onClick={() => setReleaseModal(true)}>
            Nouvelle release
          </Btn>
          <Btn
            icon="send"
            onClick={handleGenerate}
            disabled={generating || selected.size === 0}
          >
            Générer la campagne ({selected.size})
          </Btn>
        </div>
      </div>

      <div className="grid-2 mb-22" style={{ alignItems: 'start' }}>
        <Card head="Releases & nouveautés" icon="rocket">
          {releases.length === 0 ? (
            <div className="empty">Aucune release. Créez-en une pour commencer.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {releases.map((release) => (
                <div
                  key={release.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r-md, 10px)',
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>v{release.version}</strong>
                    <span style={{ flex: 1 }}>{release.title}</span>
                    <Pill tone={release.status === 'publiee' ? 'success' : 'neutral'}>
                      {releaseStatusLabels[release.status]}
                    </Pill>
                    {release.status === 'brouillon' && (
                      <Btn
                        variant="ghost"
                        size="sm"
                        icon="check"
                        onClick={() => handlePublish(release.id)}
                      >
                        Publier
                      </Btn>
                    )}
                    <Btn
                      variant="danger-ghost"
                      size="sm"
                      icon="trash"
                      onClick={() => handleDeleteRelease(release.id)}
                    />
                  </div>

                  {release.entries.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {release.entries.map((entry) => (
                        <label
                          key={entry.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: 'var(--paper-2)',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(entry.id)}
                            onChange={() => toggleEntry(entry.id)}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ flex: 1 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Pill tone={CATEGORY_TONE[entry.category]}>
                                {changelogCategoryLabels[entry.category]}
                              </Pill>
                              <strong>{entry.title}</strong>
                              {entry.isHighlight && <Icon name="star" size={13} />}
                            </span>
                            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                              {entry.description}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteEntry(entry.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--ink-3)',
                            }}
                            aria-label="Supprimer"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </label>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <Btn
                      variant="subtle"
                      size="sm"
                      icon="plus"
                      onClick={() => setEntryModal(release.id)}
                    >
                      Ajouter une nouveauté
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card head="Campagnes" icon="mail">
          {campaigns.length === 0 ? (
            <div className="empty">Aucune campagne envoyée pour l'instant.</div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Sujet</th>
                    <th>Statut</th>
                    <th>Envoyés</th>
                    <th>Ouvertures</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="t-main">{c.subject}</td>
                      <td>
                        <Pill tone={CAMPAIGN_TONE[c.status]}>
                          {campaignStatusLabels[c.status]}
                        </Pill>
                      </td>
                      <td className="t-mono">
                        {c.sentCount}/{c.totalRecipients}
                      </td>
                      <td className="t-mono">{c.openedCount}</td>
                      <td className="t-sub">{formatDate(c.sentAt ?? c.createdAt)}</td>
                      <td>
                        <Btn
                          variant="ghost"
                          size="sm"
                          icon="arrowRight"
                          onClick={() => navigate(`/newsletter/campaign/${c.id}`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={releaseModal}
        title="Nouvelle release"
        onClose={() => setReleaseModal(false)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setReleaseModal(false)}>
              Annuler
            </Btn>
            <Btn onClick={handleCreateRelease}>Créer</Btn>
          </>
        }
      >
        <div className="field-grid">
          <div>
            <div className="field-label">Version</div>
            <input
              className="neo-field"
              placeholder="1.4.0"
              value={releaseForm.version}
              onChange={(e) => setReleaseForm((f) => ({ ...f, version: e.target.value }))}
            />
          </div>
          <div>
            <div className="field-label">Titre</div>
            <input
              className="neo-field"
              value={releaseForm.title}
              onChange={(e) => setReleaseForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="field-label">Description (optionnelle)</div>
          <textarea
            className="neo-field"
            rows={3}
            value={releaseForm.description}
            onChange={(e) => setReleaseForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={entryModal !== null}
        title="Ajouter une nouveauté"
        onClose={() => setEntryModal(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEntryModal(null)}>
              Annuler
            </Btn>
            <Btn onClick={handleCreateEntry}>Ajouter</Btn>
          </>
        }
      >
        <div className="field-label">Titre</div>
        <input
          className="neo-field"
          value={entryForm.title}
          onChange={(e) => setEntryForm((f) => ({ ...f, title: e.target.value }))}
        />
        <div style={{ marginTop: 12 }}>
          <div className="field-label">Description</div>
          <textarea
            className="neo-field"
            rows={3}
            value={entryForm.description}
            onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="field-grid" style={{ marginTop: 12 }}>
          <div>
            <div className="field-label">Catégorie</div>
            <select
              className="neo-field"
              value={entryForm.category}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, category: e.target.value as ChangelogCategory }))
              }
            >
              {(Object.keys(changelogCategoryLabels) as ChangelogCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {changelogCategoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
            <input
              type="checkbox"
              checked={entryForm.isHighlight}
              onChange={(e) => setEntryForm((f) => ({ ...f, isHighlight: e.target.checked }))}
            />
            Mettre en avant
          </label>
        </div>
      </Modal>
    </div>
  );
}

export default NewsletterPage;
