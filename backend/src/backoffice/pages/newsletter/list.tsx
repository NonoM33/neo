import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import {
  changelogCategoryLabels,
  emailCampaignStatusLabels,
  releaseStatusLabels,
  type EmailCampaign,
} from '../../../db/schema';
import type { ReleaseWithEntries } from '../../../modules/newsletter';
import { computeOpenRate } from '../../../modules/newsletter/campaign.service';

interface NewsletterPageProps {
  releases: ReleaseWithEntries[];
  campaigns: EmailCampaign[];
  eligibleCount: number;
  user: AdminUser;
  success?: string;
  error?: string;
}

const CATEGORY_KEYS = Object.keys(changelogCategoryLabels) as Array<
  keyof typeof changelogCategoryLabels
>;

export const NewsletterPage: FC<NewsletterPageProps> = ({
  releases,
  campaigns,
  eligibleCount,
  user,
  success,
  error,
}) => {
  return (
    <Layout title="Newsletter" currentPath="/backoffice/newsletter" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="alert alert-info d-flex align-items-center gap-2 mb-4">
        <i class="bi bi-info-circle-fill"></i>
        <div class="small">
          Cochez les nouveautes a annoncer, generez un email redige par l'IA,
          previsualisez-le puis envoyez-le a vos{' '}
          <strong>{eligibleCount} clients</strong> avec suivi des ouvertures.
        </div>
      </div>

      {/*
        Formulaire de selection autonome (vide) : les cases a cocher s'y
        rattachent via l'attribut HTML5 form="selection-form". On evite ainsi
        tout formulaire imbrique (les formulaires de creation release/entree
        cohabitent dans le meme bloc sans etre englobes).
      */}
      <form id="selection-form" method="post" action="/backoffice/newsletter/preview"></form>

      <div class="row g-4">
        {/* Colonne gauche : selection + generation */}
        <div class="col-lg-8">
          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><i class="bi bi-card-checklist me-2"></i>Releases & nouveautes</span>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                data-bs-toggle="collapse"
                data-bs-target="#new-release-form"
              >
                <i class="bi bi-plus-lg me-1"></i>Nouvelle release
              </button>
            </div>
            <div class="card-body">
              <div class="collapse mb-4" id="new-release-form">
                <NewReleaseForm />
              </div>

              {releases.length === 0 ? (
                <p class="text-muted mb-0">
                  Aucune release. Creez-en une pour commencer a saisir des
                  nouveautes.
                </p>
              ) : (
                releases.map((release) => (
                  <ReleaseBlock release={release} />
                ))
              )}
            </div>
          </div>

          <div class="card mb-4">
            <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="small text-muted">
                <i class="bi bi-magic me-1"></i>
                L'IA redige un email a partir des nouveautes cochees, groupees
                par release.
              </div>
              <button type="submit" form="selection-form" class="btn btn-primary">
                <i class="bi bi-stars me-1"></i>Generer l'apercu de l'email
              </button>
            </div>
          </div>
        </div>

        {/* Colonne droite : campagnes */}
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header">
              <i class="bi bi-send me-2"></i>Campagnes
            </div>
            <div class="card-body">
              {campaigns.length === 0 ? (
                <p class="text-muted mb-0 small">Aucune campagne pour le moment.</p>
              ) : (
                <div class="list-group list-group-flush">
                  {campaigns.map((campaign) => (
                    <CampaignRow campaign={campaign} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const NewReleaseForm: FC = () => (
  <div class="border rounded p-3 bg-light">
    {/* Sous-formulaire dedie : action distincte, pas de formulaire imbrique */}
    <form method="post" action="/backoffice/newsletter/release" class="row g-2 align-items-end">
      <div class="col-md-3">
        <label class="form-label small text-muted">Version</label>
        <input type="text" name="version" class="form-control form-control-sm" placeholder="2.1.0" required />
      </div>
      <div class="col-md-5">
        <label class="form-label small text-muted">Titre</label>
        <input type="text" name="title" class="form-control form-control-sm" placeholder="Refonte du tableau de bord" required />
      </div>
      <div class="col-md-4">
        <label class="form-label small text-muted">Description (optionnel)</label>
        <input type="text" name="description" class="form-control form-control-sm" />
      </div>
      <div class="col-12">
        <button type="submit" class="btn btn-sm btn-primary">
          <i class="bi bi-check-lg me-1"></i>Creer la release
        </button>
      </div>
    </form>
  </div>
);

const ReleaseBlock: FC<{ release: ReleaseWithEntries }> = ({ release }) => {
  const statusLabel = releaseStatusLabels[release.status];
  return (
    <div class="mb-4 border rounded overflow-hidden">
      <div class="d-flex justify-content-between align-items-center px-3 py-2" style="background:#f8f9fa;">
        <div>
          <span class="fw-600">{release.title}</span>
          <span class="badge bg-secondary ms-2">v{release.version}</span>
          <span class={`badge bg-${statusLabel.color} ms-1`}>{statusLabel.label}</span>
        </div>
        <div class="d-flex gap-1">
          {release.status === 'brouillon' && (
            <a
              href={`/backoffice/newsletter/release/${release.id}/publish`}
              class="btn btn-sm btn-success btn-action"
              onclick="event.preventDefault();if(confirm('Publier cette release ? Elle sera annoncee sur Mattermost et ajoutee au CHANGELOG.md.')){const f=document.createElement('form');f.method='post';f.action=this.getAttribute('href');document.body.appendChild(f);f.submit();}"
              title="Publier (annonce Mattermost + CHANGELOG.md)"
            >
              <i class="bi bi-rocket-takeoff me-1"></i>Publier
            </a>
          )}
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary btn-action"
            data-bs-toggle="collapse"
            data-bs-target={`#entry-form-${release.id}`}
            title="Ajouter une nouveaute"
          >
            <i class="bi bi-plus-lg"></i>
          </button>
          <a
            href={`/backoffice/newsletter/release/${release.id}/delete`}
            class="btn btn-sm btn-outline-danger btn-action"
            data-confirm="Supprimer cette release et ses nouveautes ?"
            onclick="if(!confirm(this.getAttribute('data-confirm')))event.preventDefault();else{event.preventDefault();const f=document.createElement('form');f.method='post';f.action=this.getAttribute('href');document.body.appendChild(f);f.submit();}"
            title="Supprimer la release"
          >
            <i class="bi bi-trash"></i>
          </a>
        </div>
      </div>

      <div class="collapse" id={`entry-form-${release.id}`}>
        <div class="px-3 py-3 border-bottom bg-white">
          <NewEntryForm releaseId={release.id} />
        </div>
      </div>

      <div class="px-3 py-2">
        {release.entries.length === 0 ? (
          <div class="text-muted small py-2">Aucune nouveaute dans cette release.</div>
        ) : (
          release.entries.map((entry) => {
            const cat = changelogCategoryLabels[entry.category];
            return (
              <div class="d-flex align-items-start gap-2 py-2 border-bottom">
                <input
                  type="checkbox"
                  name="entryIds"
                  value={entry.id}
                  form="selection-form"
                  class="form-check-input mt-1"
                  checked
                />
                <div class="flex-grow-1">
                  <span class={`badge bg-${cat.color} me-1`}>
                    <i class={`bi ${cat.icon} me-1`}></i>{cat.label}
                  </span>
                  {entry.isHighlight && (
                    <span class="badge bg-warning text-dark me-1">
                      <i class="bi bi-star-fill me-1"></i>A la une
                    </span>
                  )}
                  <span class="fw-600">{entry.title}</span>
                  <div class="small text-muted">{entry.description}</div>
                </div>
                <a
                  href={`/backoffice/newsletter/entry/${entry.id}/delete`}
                  class="btn btn-sm btn-outline-danger btn-action"
                  onclick="event.preventDefault();if(confirm('Supprimer cette nouveaute ?')){const f=document.createElement('form');f.method='post';f.action=this.getAttribute('href');document.body.appendChild(f);f.submit();}"
                  title="Supprimer"
                >
                  <i class="bi bi-x-lg"></i>
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const NewEntryForm: FC<{ releaseId: string }> = ({ releaseId }) => (
  <form method="post" action={`/backoffice/newsletter/release/${releaseId}/entry`} class="row g-2 align-items-end">
    <div class="col-md-3">
      <label class="form-label small text-muted">Categorie</label>
      <select name="category" class="form-select form-select-sm">
        {CATEGORY_KEYS.map((key) => (
          <option value={key}>{changelogCategoryLabels[key].label}</option>
        ))}
      </select>
    </div>
    <div class="col-md-5">
      <label class="form-label small text-muted">Titre</label>
      <input type="text" name="title" class="form-control form-control-sm" required />
    </div>
    <div class="col-md-4">
      <label class="form-label small text-muted">Description</label>
      <input type="text" name="description" class="form-control form-control-sm" required />
    </div>
    <div class="col-md-3">
      <div class="form-check mt-1">
        <input type="checkbox" name="isHighlight" value="1" class="form-check-input" id={`hl-${releaseId}`} />
        <label class="form-check-label small" for={`hl-${releaseId}`}>Mettre a la une</label>
      </div>
    </div>
    <div class="col-md-9 text-end">
      <button type="submit" class="btn btn-sm btn-primary">
        <i class="bi bi-check-lg me-1"></i>Ajouter la nouveaute
      </button>
    </div>
  </form>
);

const CampaignRow: FC<{ campaign: EmailCampaign }> = ({ campaign }) => {
  const status = emailCampaignStatusLabels[campaign.status];
  const openRate = computeOpenRate(campaign.sentCount, campaign.openedCount);
  return (
    <a
      href={`/backoffice/newsletter/campaign/${campaign.id}`}
      class="list-group-item list-group-item-action px-0"
    >
      <div class="d-flex justify-content-between align-items-start">
        <div class="fw-600 small text-truncate" style="max-width:200px;">
          {campaign.subject}
        </div>
        <span class={`badge bg-${status.color}`}>{status.label}</span>
      </div>
      <div class="small text-muted mt-1">
        {campaign.status === 'envoyee' || campaign.status === 'envoi' ? (
          <>
            <i class="bi bi-people me-1"></i>{campaign.sentCount}/{campaign.totalRecipients} envoyes
            <span class="ms-2"><i class="bi bi-eye me-1"></i>{openRate}% ouverts</span>
          </>
        ) : (
          <span>{new Date(campaign.createdAt).toLocaleDateString('fr-FR')}</span>
        )}
      </div>
    </a>
  );
};
