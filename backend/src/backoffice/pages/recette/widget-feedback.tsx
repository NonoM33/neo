import type { FC } from 'hono/jsx';
import {
  recetteAppLabels,
  recetteKindLabels,
  recetteSeverityLabels,
  recetteStatusLabels,
} from '../../../db/schema';
import type { FeedbackWithComments } from '../../../modules/recette/recette.service';

interface WidgetFeedbackPanelProps {
  items: FeedbackWithComments[];
  currentUserName: string;
}

const STATUS_OPTIONS = Object.entries(recetteStatusLabels);

// Panneau des retours remontes via le widget terrain (bouton flottant), cote
// staff : visibles dans le centre de recette avec contexte technique, suivi de
// statut et fil de reponses. Passer un retour en "Valide" notifie le rapporteur.
export const WidgetFeedbackPanel: FC<WidgetFeedbackPanelProps> = ({
  items,
  currentUserName,
}) => {
  const swap = {
    'hx-target': '#recette-widget-panel',
    'hx-swap': 'outerHTML',
  } as const;

  return (
    <div id="recette-widget-panel" class="card mb-4" style="border:none;box-shadow:0 0 10px rgba(0,0,0,0.05);border-radius:10px;">
      <div class="card-header bg-white d-flex align-items-center justify-content-between" style="border-bottom:1px solid #e9ecef;font-weight:600;">
        <span>
          <i class="bi bi-chat-left-dots me-2"></i>Retours terrain (widget)
          <span class="badge bg-secondary ms-2">{items.length}</span>
        </span>
      </div>
      <div class="card-body">
        {items.length === 0 ? (
          <p class="text-muted mb-0 small">Aucun retour remonte via le bouton de feedback pour le moment.</p>
        ) : (
          items.map((fb) => {
            const kind = recetteKindLabels[fb.kind];
            const sev = recetteSeverityLabels[fb.severity];
            const st = recetteStatusLabels[fb.status];
            const ctx = fb.context;
            return (
              <div class="border rounded p-3 mb-3" style="border-radius:10px;">
                <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <div>
                    <span class={`badge bg-${kind.color} me-1`}>
                      <i class={`bi ${kind.icon} me-1`}></i>{kind.label}
                    </span>
                    <span class={`badge bg-${sev.color} me-1`}>{sev.label}</span>
                    {fb.app && <span class="badge bg-dark me-1">{recetteAppLabels[fb.app]}</span>}
                    <span class={`badge bg-${st.color}`}>{st.label}</span>
                  </div>
                  <small class="text-muted">{new Date(fb.createdAt).toLocaleString('fr-FR')}</small>
                </div>

                <h6 class="mt-2 mb-1 fw-600">{fb.title}</h6>
                <div class="small text-muted mb-2">
                  Par {fb.author}
                  {fb.reporterEmail && ` · ${fb.reporterEmail}`}
                </div>

                {fb.actualResult && (
                  <p class="small mb-2" style="white-space:pre-wrap;">{fb.actualResult}</p>
                )}
                {fb.expectedResult && (
                  <p class="small mb-2 text-muted">
                    <strong>Attendu :</strong> <span style="white-space:pre-wrap;">{fb.expectedResult}</span>
                  </p>
                )}
                {fb.stepsToReproduce && (
                  <p class="small mb-2 text-muted">
                    <strong>Etapes :</strong> <span style="white-space:pre-wrap;">{fb.stepsToReproduce}</span>
                  </p>
                )}

                {ctx && (
                  <details class="mb-2">
                    <summary class="small text-muted" style="cursor:pointer;">
                      <i class="bi bi-wrench me-1"></i>Contexte technique
                      {ctx.logs?.length ? ` · ${ctx.logs.length} log(s)` : ''}
                    </summary>
                    <div class="small text-muted mt-2" style="word-break:break-all;">
                      {ctx.url && <div><strong>URL :</strong> <code>{ctx.url}</code></div>}
                      {ctx.route && <div><strong>Route :</strong> <code>{ctx.route}</code></div>}
                      {ctx.viewport && <div><strong>Viewport :</strong> {ctx.viewport.width}×{ctx.viewport.height}</div>}
                      {ctx.userAgent && <div><strong>UA :</strong> {ctx.userAgent}</div>}
                      {ctx.appVersion && <div><strong>Version :</strong> {ctx.appVersion}</div>}
                      {ctx.logs?.length ? (
                        <pre class="bg-light p-2 mt-2 rounded" style="max-height:180px;overflow:auto;font-size:11px;">
                          {ctx.logs.map((l) => `[${l.level}] ${l.message}`).join('\n')}
                        </pre>
                      ) : null}
                    </div>
                  </details>
                )}

                {fb.comments.length > 0 && (
                  <div class="mb-2">
                    {fb.comments.map((com) => (
                      <div class="bg-light rounded p-2 mb-1 small">
                        <strong class="text-primary">{com.author}</strong>
                        <span class="text-muted ms-2">{new Date(com.createdAt).toLocaleDateString('fr-FR')}</span>
                        <div style="white-space:pre-wrap;">{com.body}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div class="d-flex gap-2 flex-wrap align-items-end">
                  <form
                    method="post"
                    action={`/backoffice/recette/widget-feedback/${fb.id}/status`}
                    hx-post={`/backoffice/recette/widget-feedback/${fb.id}/status`}
                    {...swap}
                    class="d-flex gap-2 align-items-end mb-0"
                  >
                    <select name="status" class="form-select form-select-sm" style="width:auto;">
                      {STATUS_OPTIONS.map(([key, { label }]) => (
                        <option value={key} selected={key === fb.status}>{label}</option>
                      ))}
                    </select>
                    <button type="submit" class="btn btn-sm btn-outline-primary">Mettre a jour</button>
                  </form>
                </div>

                <form
                  method="post"
                  action={`/backoffice/recette/widget-feedback/${fb.id}/comment`}
                  hx-post={`/backoffice/recette/widget-feedback/${fb.id}/comment`}
                  {...swap}
                  class="mt-2"
                >
                  <input type="hidden" name="author" value={currentUserName} />
                  <div class="input-group input-group-sm">
                    <input
                      type="text"
                      name="body"
                      class="form-control"
                      placeholder="Repondre au rapporteur (visible dans son suivi)..."
                    />
                    <button type="submit" class="btn btn-outline-secondary">
                      <i class="bi bi-send"></i>
                    </button>
                  </div>
                </form>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
