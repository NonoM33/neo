import type { FC } from 'hono/jsx';
import {
  recetteSeverityLabels,
  recetteStatusLabels,
  recetteValidationLabels,
} from '../../../db/schema';
import type {
  FeatureWithFeedback,
  FeedbackWithComments,
} from '../../../modules/recette/recette.service';

const severityOptions = Object.entries(recetteSeverityLabels);
const statusOptions = Object.entries(recetteStatusLabels);

// Aide en langage simple pour un testeur non technique.
const severityHelp: Record<string, string> = {
  bloquant: 'Impossible de continuer, la fonction ne marche pas du tout.',
  majeur: 'Gros souci, mais on peut contourner ou continuer autrement.',
  mineur: 'Genant mais pas grave, on peut vivre avec pour l instant.',
  cosmetique: 'Detail visuel : texte, couleur, alignement, faute d orthographe.',
};

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
          hx-post={`/backoffice/recette/feedback/${fb.id}/delete`}
          hx-target={`#feature-${fb.featureId}`}
          hx-swap="outerHTML"
          hx-confirm="Supprimer ce retour ?"
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

      {(fb.expectedResult || fb.actualResult) && (
        <div class="row g-2 mt-1">
          {fb.expectedResult && (
            <div class="col-md-6">
              <div class="small text-muted fw-600">
                <i class="bi bi-check2 text-success me-1"></i>Resultat attendu
              </div>
              <div class="small" style="white-space:pre-wrap;">{fb.expectedResult}</div>
            </div>
          )}
          {fb.actualResult && (
            <div class="col-md-6">
              <div class="small text-muted fw-600">
                <i class="bi bi-x-lg text-danger me-1"></i>Resultat obtenu
              </div>
              <div class="small" style="white-space:pre-wrap;">{fb.actualResult}</div>
            </div>
          )}
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
          hx-post={`/backoffice/recette/feedback/${fb.id}/status`}
          hx-target={`#feature-${fb.featureId}`}
          hx-swap="outerHTML"
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
          hx-post={`/backoffice/recette/feedback/${fb.id}/comment`}
          hx-target={`#feature-${fb.featureId}`}
          hx-swap="outerHTML"
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
        hx-post="/backoffice/recette/feedback"
        hx-target={`#feature-${featureId}`}
        hx-swap="outerHTML"
        hx-encoding="multipart/form-data"
        class="border rounded p-3 mb-3"
        style="background:#f8f9fa;"
      >
        <input type="hidden" name="featureId" value={featureId} />

        <div class="alert alert-primary d-flex gap-2 small mb-3">
          <i class="bi bi-lightbulb-fill"></i>
          <div>
            Decrivez le probleme comme si vous l'expliquiez a quelqu'un par
            telephone. Plus c'est precis, plus vite on peut corriger. Prenez le
            temps de remplir chaque etape ci-dessous.
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label fw-600 mb-1">
            <span class="badge bg-primary me-1">1</span>
            En une phrase, quel est le probleme ?
          </label>
          <input
            type="text"
            name="title"
            class="form-control"
            required
            placeholder="Ex : Impossible d'enregistrer un nouvel utilisateur"
          />
        </div>

        <div class="mb-3">
          <label class="form-label fw-600 mb-1">
            <span class="badge bg-primary me-1">2</span>
            Qu'avez-vous fait, etape par etape ?
          </label>
          <textarea
            name="stepsToReproduce"
            class="form-control"
            rows={4}
            required
            placeholder={
              '1. Je vais sur la page Utilisateurs\n2. Je clique sur "Nouveau"\n3. Je remplis le formulaire\n4. Je clique sur Enregistrer'
            }
          ></textarea>
          <div class="form-text">
            Numerotez chaque action. On doit pouvoir refaire exactement la meme chose.
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label fw-600 mb-1">
              <span class="badge bg-success me-1">3</span>
              Que devait-il se passer ?
            </label>
            <textarea
              name="expectedResult"
              class="form-control"
              rows={3}
              required
              placeholder="Ex : L'utilisateur devait etre cree et apparaitre dans la liste."
            ></textarea>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-600 mb-1">
              <span class="badge bg-danger me-1">4</span>
              Que s'est-il passe a la place ?
            </label>
            <textarea
              name="actualResult"
              class="form-control"
              rows={3}
              required
              placeholder="Ex : Un message rouge 'Erreur 500' s'affiche et rien n'est enregistre."
            ></textarea>
            <div class="form-text">Recopiez le message d'erreur exact s'il y en a un.</div>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label fw-600 mb-1">
            <span class="badge bg-primary me-1">5</span>
            A quel point est-ce genant ?
          </label>
          <select name="severity" class="form-select">
            {severityOptions.map(([key, { label }]) => (
              <option value={key} selected={key === 'majeur'}>
                {label} — {severityHelp[key]}
              </option>
            ))}
          </select>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label fw-600 mb-1">
              <span class="badge bg-primary me-1">6</span>
              Ajoutez une capture d'ecran
            </label>
            <input type="file" name="screenshot" accept="image/*" class="form-control" />
            <div class="form-text">
              Une image vaut mille mots : capturez l'ecran ou le message d'erreur.
            </div>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-600 mb-1">Votre nom</label>
            <input
              type="text"
              name="author"
              class="form-control"
              value={currentUserName}
              required
            />
          </div>
        </div>

        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-send me-1"></i>Envoyer le retour
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
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
  expanded?: boolean;
}> = ({ feature, currentUserName, isAdminRoute, expanded = false }) => {
  const openCount = feature.feedback.filter(
    (f) => f.status === 'ouvert' || f.status === 'a_revoir'
  ).length;
  const collapseId = `feature-body-${feature.id}`;
  const validation = recetteValidationLabels[feature.validationStatus];

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
          <span class={`badge bg-${validation.color}`} title="Statut de recette">
            <i class={`bi ${validation.icon} me-1`}></i>{validation.label}
          </span>
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
      <div class={`collapse${expanded ? ' show' : ''}`} id={collapseId}>
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

          <div class="border rounded p-3 mb-3" style="background:#f8f9fa;">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span class="small text-muted fw-600 me-2">Recettage</span>
                <span class={`badge bg-${validation.color}`}>
                  <i class={`bi ${validation.icon} me-1`}></i>{validation.label}
                </span>
                {feature.validatedBy && feature.validatedAt && (
                  <span class="text-muted small ms-2">
                    par {feature.validatedBy} le {formatDate(feature.validatedAt)}
                  </span>
                )}
              </div>
              <div class="d-flex gap-2">
                {feature.validationStatus !== 'valide' && (
                  <form
                    hx-post={`/backoffice/recette/feature/${feature.id}/validation`}
                    hx-target={`#feature-${feature.id}`}
                    hx-swap="outerHTML"
                  >
                    <input type="hidden" name="status" value="valide" />
                    <button type="submit" class="btn btn-sm btn-success">
                      <i class="bi bi-check2-circle me-1"></i>Valider
                    </button>
                  </form>
                )}
                {feature.validationStatus !== 'a_corriger' && (
                  <form
                    hx-post={`/backoffice/recette/feature/${feature.id}/validation`}
                    hx-target={`#feature-${feature.id}`}
                    hx-swap="outerHTML"
                  >
                    <input type="hidden" name="status" value="a_corriger" />
                    <button type="submit" class="btn btn-sm btn-outline-danger">
                      <i class="bi bi-x-circle me-1"></i>A corriger
                    </button>
                  </form>
                )}
                {feature.validationStatus !== 'a_tester' && (
                  <form
                    hx-post={`/backoffice/recette/feature/${feature.id}/validation`}
                    hx-target={`#feature-${feature.id}`}
                    hx-swap="outerHTML"
                  >
                    <input type="hidden" name="status" value="a_tester" />
                    <button type="submit" class="btn btn-sm btn-outline-secondary" title="Reinitialiser">
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                  </form>
                )}
              </div>
            </div>
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
