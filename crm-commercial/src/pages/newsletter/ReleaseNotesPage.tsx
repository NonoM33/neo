import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { newsletterService } from '../../services';
import { changelogCategoryLabels } from '../../types/newsletter.types';
import type {
  ChangelogCategory,
  ChangelogEntry,
  ReleaseWithEntries,
} from '../../types/newsletter.types';

const CATEGORY_ORDER: ChangelogCategory[] = ['nouveaute', 'amelioration', 'correction'];

const CATEGORY_TONE: Record<ChangelogCategory, PillTone> = {
  nouveaute: 'info',
  amelioration: 'ochre',
  correction: 'success',
};

function formatDate(value: string | null): string {
  return new Date(value ?? Date.now()).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function orderedEntries(release: ReleaseWithEntries): ChangelogEntry[] {
  return [...release.entries].sort((a, b) => {
    if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.sortOrder - b.sortOrder;
  });
}

function EntryRow({ entry }: { entry: ChangelogEntry }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <Pill tone={CATEGORY_TONE[entry.category]}>{changelogCategoryLabels[entry.category]}</Pill>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600 }}>{entry.title}</span>
        {entry.isHighlight && (
          <Icon name="star" size={13} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
        )}
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.5 }}>
          {entry.description}
        </div>
      </div>
    </div>
  );
}

export function ReleaseNotesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [releases, setReleases] = useState<ReleaseWithEntries[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await newsletterService.listPublishedReleases();
        if (!cancelled) setReleases(data);
      } catch (error) {
        console.error('Failed to load release notes:', error);
        toast.error('Impossible de charger les notes de version');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner />;

  const [latest, ...rest] = releases;

  return (
    <div className="release-notes-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Notes de version</h1>
          <p>
            Chaque release publiée est annoncée sur Mattermost et ajoutée au CHANGELOG.md.
          </p>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="edit" onClick={() => navigate('/newsletter')}>
            Gérer les releases
          </Btn>
        </div>
      </div>

      {releases.length === 0 ? (
        <Card head="Aucune release" icon="rocket">
          <div className="empty">
            Aucune release publiée pour le moment.{' '}
            <button
              type="button"
              onClick={() => navigate('/newsletter')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--komun)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Créer et publier une release
            </button>
          </div>
        </Card>
      ) : (
        <div style={{ maxWidth: 880 }}>
          {latest && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--komun) 0%, var(--ochre) 100%)',
                  borderRadius: 'var(--r-lg, 16px)',
                  color: '#fff',
                  padding: 32,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(255,255,255,0.18)',
                      borderRadius: 'var(--r-pill, 999px)',
                      padding: '3px 10px',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="sparkles" size={13} /> Dernière release
                  </span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.18)',
                      borderRadius: 'var(--r-pill, 999px)',
                      padding: '3px 10px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                    }}
                  >
                    v{latest.version}
                  </span>
                  <span style={{ opacity: 0.8, fontSize: 13 }}>
                    {formatDate(latest.releasedAt)}
                  </span>
                </div>
                <h2 style={{ fontWeight: 700, margin: '0 0 8px' }}>{latest.title}</h2>
                {latest.description && (
                  <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>{latest.description}</p>
                )}
              </div>
              <Card head={`${latest.entries.length} nouveauté${latest.entries.length > 1 ? 's' : ''}`} icon="rocket">
                {orderedEntries(latest).map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </Card>
            </div>
          )}

          {rest.map((release) => (
            <div key={release.id} style={{ marginBottom: 20 }}>
              <Card>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--paper-2)',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    v{release.version}
                  </span>
                  <span style={{ fontWeight: 600 }}>{release.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-3)' }}>
                    {formatDate(release.releasedAt)}
                  </span>
                </div>
                {release.description && (
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
                    {release.description}
                  </p>
                )}
                {orderedEntries(release).map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReleaseNotesPage;
