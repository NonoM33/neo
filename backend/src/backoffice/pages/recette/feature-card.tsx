import type { FC } from 'hono/jsx';
import {
  recetteSeverityLabels,
  recetteStatusLabels,
} from '../../../db/schema';
import type {
  FeatureWithFeedback,
  FeedbackWithComments,
} from '../../../modules/recette/recette.service';

const severityOptions = Object.entries(recetteSeverityLabels);
const statusOptions = Object.entries(recetteStatusLabels);

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FeedbackItem: FC<{ fb: FeedbackWithComments; currentUserName: string }> = ({
  fb,
  currentUserName,
}) => {
  const sev = recetteSeverityLabels[fb.severity];
  const st = recetteStatusLabels[fb.status];
  return (
    <div class="border rounded p-3 mb-3" style="background:#fff;">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <span class={`badge bg-${sev.color} me-2`}>{sev.label}</span>
          <span class={`badge bg-${st.color} me-2`}>{st.label}</span>
          <strong>{fb.title}</strong>
          <div class="text-muted small mt-1">
            <i class="bi bi-person me-1"></i>{fb.author}
            <span class="mx-2">&middot;</span>
            <i class="bi bi-clock me-1"></i>{formatDate(fb.createdAt)}
          </div>
        </div>
        <form
          method="post"
          action={`/backoffice/recette/feedback/${fb.id}/delete`}
          onsubmit="return confirm('Supprimer ce retour ?')"
        >
          <button type="submit" class="btn btn-sm btn-outline-danger" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </form>
      </div>

      {fb.stepsToReproduce && (
        <div class="mt-2">
          <div class="small text-muted fw-600">Etapes de repro</div>
          <pre class="small mb-0" style="white-space:pre-wrap;font-family:inherit;background:#f8f9fa;padding:8px;border-radius:6px;">{fb.stepsToReproduce}</pre>
        </div>
      )}

      {fb.screenshotKey && (
        <div class="mt-2">
          <a href={`/backoffice/recette/screenshot/${fb.id}`} target="_blank">
            <img
              src={`/backoffice/recette/screenshot/${fb.id}`}
              alt="capture"
              style="max-height:140px;border-radius:8px;border:2px solid #e9ecef;"
            />
          </a>
        </div>
      )}

      {fb.comments.length > 0 && (
        <div class="mt-3 ps-3 border-start">
          {fb.comments.map((c) => (
            <div class="mb-2">
              <div class="small">
                <strong>{c.author}</strong>
                <span class="text-muted ms-2">{formatDate(c.createdAt)}</span>
              </div>
              <div class="small" style="white-space:pre-wrap;">{c.body}</div>
            </div>
          ))}
        </div>
      )}

      <div class="d-flex flex-wrap gap-2 mt-3 align-items-end">
        <form
          method="post"
          action={`/backoffice/recette/feedback/${fb.id}/status`}
          class="d-flex gap-2 align-items-end"
        >
          <div>
            <label class="form-label small text-muted mb-1">Statut</label>
            <select name="status" class="form-select form-select-sm" style="width:auto;">
              {statusOptions.map(([key, { label }]) => (
                <option value={key} selected={key === fb.status}>{label}</option>
              ))}
            </select>
          </div>
          <button type="submit" class="btn btn-sm btn-outline-primary">Mettre a jour</button>
        </form>

        <form
          method="post"
          action={`/backoffice/recette/feedback/${fb.id}/comment`}
          class="d-flex gap-2 align-items-end flex-grow-1"
        >
          <input type="hidden" name="author" value={currentUserName} />
          <div class="flex-grow-1">
            <label class="form-label small text-muted mb-1">Commentaire</label>
            <input
              type="text"
              name="body"
              class="form-control form-control-sm"
              placeholder="Ajouter un commentaire..."
              required
            />
          </div>
          <button type="submit" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-send"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

const AddFeedbackForm: FC<{ featureId: string; currentUserName: string }> = ({
  featureId,
  currentUserName,
}) => {
  const formId = `add-fb-${featureId}`;
  return (
    <div class="collapse" id={formId}>
      <form
        method="post"
        action="/backoffice/recette/feedback"
        enctype="multipart/form-data"
        class="border rounded p-3 mb-3"
        style="background:#f8f9fa;"
      >
        <input type="hidden" name="featureId" value={featureId} />
        <div class="row g-2">
          <div class="col-md-8">
            <label class="form-label small text-muted mb-1">Resume du bug</label>
            <input type="text" name="title" class="form-control form-control-sm" required />
          </div>
          <div class="col-md-4">
            <label class="form-label small text-muted mb-1">Severite</label>
            <select name="severity" class="form-select form-select-sm">
              {severityOptions.map(([key, { label }]) => (
                <option value={key} selected={key === 'majeur'}>{label}</option>
              ))}
            </select>
          </div>
          <div class="col-md-8">
            <label class="form-label small text-muted mb-1">Etapes de reproduction</label>
            <textarea name="stepsToReproduce" class="form-control form-control-sm" rows={3}></textarea>
          </div>
          <div class="col-md-4">
            <label class="form-label small text-muted mb-1">Auteur</label>
            <input type="text" name="author" class="form-control form-control-sm" value={currentUserName} required />
            <label class="form-label small text-muted mb-1 mt-2">Capture d'ecran</label>
            <input type="file" name="screenshot" accept="image/*" class="form-control form-control-sm" />
          </div>
        </div>
        <div class="mt-3 d-flex gap-2">
          <button type="submit" class="btn btn-sm btn-primary">
            <i class="bi bi-bug me-1"></i>Remonter le bug
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            data-bs-toggle="collapse"
            data-bs-target={`#${formId}`}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export const FeatureCard: FC<{
  feature: FeatureWithFeedback;
  currentUserName: string;
  isAdminRoute: boolean;
}> = ({ feature, currentUserName, isAdminRoute }) => {
  const openCount = feature.feedback.filter(
    (f) => f.status === 'ouvert' || f.status === 'a_revoir'
  ).length;
  const collapseId = `feature-body-${feature.id}`;

  return (
    <div class="card mb-2" id={`feature-${feature.id}`}>
      <div
        class="card-header d-flex justify-content-between align-items-center"
        style="cursor:pointer;"
        data-bs-toggle="collapse"
        data-bs-target={`#${collapseId}`}
      >
        <div>
          <span class="fw-600">{feature.title}</span>
          {feature.route && (
            <code class="ms-2 small text-muted">{feature.route}</code>
          )}
          <div class="text-muted small">{feature.description}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          {openCount > 0 && (
            <span class="badge bg-danger rounded-pill" title="Retours ouverts">
              {openCount}
            </span>
          )}
          {feature.feedback.length > 0 && (
            <span class="badge bg-secondary rounded-pill" title="Total retours">
              {feature.feedback.length}
            </span>
          )}
          <i class="bi bi-chevron-down"></i>
        </div>
      </div>
      <div class="collapse" id={collapseId}>
        <div class="card-body">
          <div class="d-flex gap-2 mb-3">
            <button
              class="btn btn-sm btn-outline-danger"
              data-bs-toggle="collapse"
              data-bs-target={`#add-fb-${feature.id}`}
            >
              <i class="bi bi-plus-lg me-1"></i>Remonter un bug
            </button>
            {isAdminRoute && feature.route && !feature.route.includes(':') && (
              <a
                href={feature.route}
                target="_blank"
                class="btn btn-sm btn-outline-primary"
              >
                <i class="bi bi-box-arrow-up-right me-1"></i>Ouvrir la page
              </a>
            )}
          </div>

          <AddFeedbackForm featureId={feature.id} currentUserName={currentUserName} />

          {feature.feedback.length === 0 ? (
            <div class="text-muted small fst-italic">Aucun retour pour le moment.</div>
          ) : (
            feature.feedback.map((fb) => (
              <FeedbackItem fb={fb} currentUserName={currentUserName} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
