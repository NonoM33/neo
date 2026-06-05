import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import { changelogCategoryLabels } from '../../../db/schema';
import type { ReleaseWithEntries } from '../../../modules/newsletter';

interface ReleaseNotesPageProps {
  releases: ReleaseWithEntries[];
  user: AdminUser;
  success?: string;
  error?: string;
}

// Ordre d'affichage des categories au sein d'une release.
const CATEGORY_ORDER = ['nouveaute', 'amelioration', 'correction'] as const;

function formatDate(date: Date | null): string {
  return (date ?? new Date()).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const ReleaseNotesPage: FC<ReleaseNotesPageProps> = ({
  releases,
  user,
  success,
  error,
}) => {
  return (
    <Layout
      title="Notes de version"
      currentPath="/backoffice/release-notes"
      user={user}
    >
      <FlashMessages success={success} error={error} />

      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <p class="text-muted mb-0 small">
          <i class="bi bi-info-circle me-1"></i>
          Chaque release publiée est annoncée automatiquement sur Mattermost et
          ajoutée au <code>CHANGELOG.md</code>.
        </p>
        <div class="d-flex gap-2">
          <a href="/backoffice/newsletter/changelog.md" class="btn btn-sm btn-outline-secondary" target="_blank">
            <i class="bi bi-filetype-md me-1"></i>CHANGELOG.md
          </a>
          <a href="/backoffice/newsletter" class="btn btn-sm btn-outline-primary">
            <i class="bi bi-pencil-square me-1"></i>Gérer les releases
          </a>
        </div>
      </div>

      {releases.length === 0 ? (
        <div class="card">
          <div class="card-body text-center text-muted py-5">
            <i class="bi bi-rocket-takeoff" style="font-size:2.5rem;opacity:0.4;"></i>
            <p class="mt-3 mb-1">Aucune release publiée pour le moment.</p>
            <a href="/backoffice/newsletter" class="small">
              Créer et publier une release
            </a>
          </div>
        </div>
      ) : (
        <div class="release-timeline">
          {releases.map((release, idx) => (
            <ReleaseCard release={release} highlighted={idx === 0} />
          ))}
        </div>
      )}

      <style>{`
        .release-timeline { max-width: 880px; }
        .release-hero {
          background: linear-gradient(135deg, #4f46e5 0%, #a21caf 100%);
          border-radius: 16px;
          color: #fff;
          padding: 32px;
          margin-bottom: 24px;
        }
        .release-hero .badge { background: rgba(255,255,255,0.18); }
        .release-card {
          border: none;
          box-shadow: 0 0 10px rgba(0,0,0,0.05);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .release-card .release-version {
          font-family: monospace;
          background: #eef1f5;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
        }
        .entry-row { padding: 12px 0; border-bottom: 1px solid #f1f3f5; }
        .entry-row:last-child { border-bottom: none; }
      `}</style>
    </Layout>
  );
};

const ReleaseCard: FC<{ release: ReleaseWithEntries; highlighted: boolean }> = ({
  release,
  highlighted,
}) => {
  const count = release.entries.length;

  if (highlighted) {
    return (
      <div>
        <div class="release-hero">
          <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
            <span class="badge text-uppercase fw-600">
              <i class="bi bi-stars me-1"></i>Dernière release
            </span>
            <span class="badge">v{release.version}</span>
            <span class="opacity-75 small">{formatDate(release.releasedAt)}</span>
          </div>
          <h2 class="fw-700 mb-2">{release.title}</h2>
          {release.description && (
            <p class="mb-3 opacity-90" style="line-height:1.6;">
              {release.description}
            </p>
          )}
          <span class="badge">
            <i class="bi bi-rocket-takeoff me-1"></i>
            {count} nouveauté{count > 1 ? 's' : ''}
          </span>
        </div>
        <EntriesGrid release={release} />
      </div>
    );
  }

  return (
    <div class="card release-card">
      <div class="card-body">
        <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
          <span class="release-version">v{release.version}</span>
          <span class="fw-600">{release.title}</span>
          <span class="text-muted small ms-auto">{formatDate(release.releasedAt)}</span>
        </div>
        {release.description && (
          <p class="text-muted small mb-3">{release.description}</p>
        )}
        <Entries release={release} />
      </div>
    </div>
  );
};

const EntriesGrid: FC<{ release: ReleaseWithEntries }> = ({ release }) => (
  <div class="row g-3 mb-4">
    {orderedEntries(release).map((entry) => {
      const cat = changelogCategoryLabels[entry.category];
      return (
        <div class="col-md-6">
          <div class="card release-card h-100 mb-0">
            <div class="card-body">
              <div class="d-flex align-items-center gap-2 mb-2">
                <i class={`bi ${cat.icon} text-${cat.color}`} style="font-size:1.2rem;"></i>
                <span class={`badge bg-${cat.color}`}>{cat.label}</span>
                {entry.isHighlight && (
                  <span class="badge bg-warning text-dark">
                    <i class="bi bi-star-fill me-1"></i>À la une
                  </span>
                )}
              </div>
              <div class="fw-600">{entry.title}</div>
              <div class="text-muted small mt-1" style="line-height:1.5;">
                {entry.description}
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

const Entries: FC<{ release: ReleaseWithEntries }> = ({ release }) => (
  <div>
    {orderedEntries(release).map((entry) => {
      const cat = changelogCategoryLabels[entry.category];
      return (
        <div class="entry-row d-flex align-items-start gap-2">
          <span class={`badge bg-${cat.color}`}>
            <i class={`bi ${cat.icon} me-1`}></i>{cat.label}
          </span>
          <div class="flex-grow-1">
            <span class="fw-600">{entry.title}</span>
            {entry.isHighlight && (
              <span class="badge bg-warning text-dark ms-1">À la une</span>
            )}
            <div class="text-muted small">{entry.description}</div>
          </div>
        </div>
      );
    })}
  </div>
);

// Trie les entrees : a la une d'abord, puis par categorie (nouveaute, amelioration,
// correction), puis sortOrder.
function orderedEntries(release: ReleaseWithEntries) {
  return [...release.entries].sort((a, b) => {
    if (a.isHighlight !== b.isHighlight) return a.isHighlight ? -1 : 1;
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.sortOrder - b.sortOrder;
  });
}
