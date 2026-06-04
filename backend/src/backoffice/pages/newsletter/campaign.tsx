import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import {
  emailCampaignStatusLabels,
  emailRecipientStatusLabels,
  type EmailCampaign,
  type EmailCampaignRecipient,
} from '../../../db/schema';

interface CampaignPageProps {
  campaign: EmailCampaign;
  recipients: EmailCampaignRecipient[];
  openRate: number;
  eligibleCount: number;
  user: AdminUser;
  success?: string;
  error?: string;
}

export const CampaignPage: FC<CampaignPageProps> = ({
  campaign,
  recipients,
  openRate,
  eligibleCount,
  user,
  success,
  error,
}) => {
  const status = emailCampaignStatusLabels[campaign.status];
  const isSent = campaign.status === 'envoyee' || campaign.status === 'envoi';
  const isDraft = campaign.status === 'brouillon';

  return (
    <Layout title="Apercu de campagne" currentPath="/backoffice/newsletter" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="d-flex justify-content-between align-items-center mb-4">
        <a href="/backoffice/newsletter" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>Retour
        </a>
        <span class={`badge bg-${status.color} fs-6`}>{status.label}</span>
      </div>

      {isSent && <StatsBar campaign={campaign} openRate={openRate} />}

      <div class="row g-4">
        <div class="col-lg-6">
          <div class="card">
            <div class="card-header"><i class="bi bi-pencil-square me-2"></i>Contenu</div>
            <div class="card-body">
              {isDraft ? (
                <form method="post" action={`/backoffice/newsletter/campaign/${campaign.id}`}>
                  <div class="mb-3">
                    <label class="form-label small text-muted">Sujet</label>
                    <input type="text" name="subject" class="form-control" value={campaign.subject} required />
                  </div>
                  <div class="mb-3">
                    <label class="form-label small text-muted">HTML de l'email</label>
                    <textarea name="html" class="form-control font-monospace" rows={16} style="font-size:12px;">{campaign.html}</textarea>
                  </div>
                  <button type="submit" class="btn btn-outline-primary">
                    <i class="bi bi-save me-1"></i>Enregistrer les modifications
                  </button>
                </form>
              ) : (
                <>
                  <div class="mb-2"><span class="text-muted small">Sujet :</span> <strong>{campaign.subject}</strong></div>
                  <p class="text-muted small mb-0">
                    Cette campagne a ete envoyee, son contenu n'est plus modifiable.
                  </p>
                </>
              )}
            </div>
          </div>

          {isDraft && (
            <div class="card mt-4 border-primary">
              <div class="card-body d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="small">
                  <i class="bi bi-people me-1"></i>
                  Sera envoye a <strong>{eligibleCount} clients</strong> eligibles.
                </div>
                {/* Formulaire dedie a l'envoi, action distincte */}
                <form
                  method="post"
                  action={`/backoffice/newsletter/campaign/${campaign.id}/send`}
                  onsubmit="return confirm('Envoyer cette campagne a tous les clients eligibles ?');"
                >
                  <button type="submit" class="btn btn-primary">
                    <i class="bi bi-send me-1"></i>Envoyer la campagne
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <div class="col-lg-6">
          <div class="card">
            <div class="card-header"><i class="bi bi-eye me-2"></i>Apercu rendu</div>
            <div class="card-body p-0">
              <iframe
                title="Apercu email"
                srcdoc={campaign.html}
                style="width:100%;height:560px;border:0;border-radius:0 0 10px 10px;"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      {isSent && <RecipientsTable recipients={recipients} />}
    </Layout>
  );
};

const StatsBar: FC<{ campaign: EmailCampaign; openRate: number }> = ({
  campaign,
  openRate,
}) => (
  <div class="row g-3 mb-4">
    <div class="col-md-3">
      <div class="stat-card" style="background:linear-gradient(135deg,#0d6efd,#0a58ca);">
        <div class="stat-value">{campaign.totalRecipients}</div>
        <div class="stat-label">Destinataires</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card" style="background:linear-gradient(135deg,#198754,#146c43);">
        <div class="stat-value">{campaign.sentCount}</div>
        <div class="stat-label">Envoyes</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card" style="background:linear-gradient(135deg,#0dcaf0,#0aa2c0);">
        <div class="stat-value">{campaign.openedCount}</div>
        <div class="stat-label">Ouvertures uniques</div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="stat-card" style="background:linear-gradient(135deg,#fd7e14,#dc6502);">
        <div class="stat-value">{openRate}%</div>
        <div class="stat-label">Taux d'ouverture</div>
      </div>
    </div>
  </div>
);

const RecipientsTable: FC<{ recipients: EmailCampaignRecipient[] }> = ({
  recipients,
}) => (
  <div class="card mt-4">
    <div class="card-header">
      <i class="bi bi-list-check me-2"></i>Suivi par destinataire ({recipients.length})
    </div>
    <div class="card-body p-0">
      <table class="table table-hover mb-0">
        <thead>
          <tr>
            <th class="ps-3">Email</th>
            <th>Statut</th>
            <th>Envoye</th>
            <th>Ouvert</th>
            <th class="text-center">Nb ouvertures</th>
          </tr>
        </thead>
        <tbody>
          {recipients.map((r) => {
            const st = emailRecipientStatusLabels[r.status];
            return (
              <tr>
                <td class="ps-3">{r.email}</td>
                <td><span class={`badge bg-${st.color}`}>{st.label}</span></td>
                <td class="small text-muted">
                  {r.sentAt ? new Date(r.sentAt).toLocaleString('fr-FR') : '—'}
                </td>
                <td class="small text-muted">
                  {r.openedAt ? new Date(r.openedAt).toLocaleString('fr-FR') : '—'}
                </td>
                <td class="text-center">{r.openCount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
