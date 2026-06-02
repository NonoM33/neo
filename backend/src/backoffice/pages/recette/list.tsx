import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import {
  recetteAppLabels,
  recetteSeverityLabels,
  recetteStatusLabels,
  type RecetteFeature,
} from '../../../db/schema';
import type {
  FeatureWithFeedback,
  RecetteSummary,
} from '../../../modules/recette/recette.service';
import { SummaryBar } from './summary';
import { FeatureCard } from './feature-card';

interface RecettePageProps {
  features: FeatureWithFeedback[];
  summary: RecetteSummary;
  filters: { app?: string; status?: string; severity?: string };
  user: AdminUser;
  success?: string;
  error?: string;
}

const appIcons: Record<RecetteFeature['app'], string> = {
  admin: 'bi-house-gear',
  crm: 'bi-people',
  flutter: 'bi-tablet',
  site: 'bi-globe',
};

const appOrder: RecetteFeature['app'][] = ['admin', 'crm', 'flutter', 'site'];

export const RecettePage: FC<RecettePageProps> = ({
  features,
  summary,
  filters,
  user,
  success,
  error,
}) => {
  // Regroupe par app puis par module en conservant l'ordre du catalogue.
  const byApp = new Map<RecetteFeature['app'], Map<string, FeatureWithFeedback[]>>();
  for (const feature of features) {
    if (!byApp.has(feature.app)) byApp.set(feature.app, new Map());
    const modules = byApp.get(feature.app)!;
    if (!modules.has(feature.module)) modules.set(feature.module, []);
    modules.get(feature.module)!.push(feature);
  }

  const hasFilters = filters.app || filters.status || filters.severity;

  return (
    <Layout title="Centre de recette" currentPath="/backoffice/recette" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="alert alert-info d-flex align-items-center gap-2 mb-4">
        <i class="bi bi-info-circle-fill"></i>
        <div class="small">
          Recense toutes les features des 4 apps. Deroulez une feature pour
          remonter un bug (severite, etapes, capture). Demandez ensuite a Claude
          de <strong>corriger les retours</strong> : il commente et passe les
          retours en <span class="badge bg-info">Corrige</span>, puis vous re-recettez
          et validez.
        </div>
      </div>

      <SummaryBar summary={summary} />

      {/* Filtres */}
      <div class="card mb-4">
        <div class="card-body">
          <form method="get" class="row g-2 align-items-end">
            <div class="col-md-3">
              <label class="form-label small text-muted">Application</label>
              <select name="app" class="form-select">
                <option value="">Toutes</option>
                {appOrder.map((key) => (
                  <option value={key} selected={key === filters.app}>
                    {recetteAppLabels[key]}
                  </option>
                ))}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small text-muted">Statut</label>
              <select name="status" class="form-select">
                <option value="">Tous</option>
                {Object.entries(recetteStatusLabels).map(([key, { label }]) => (
                  <option value={key} selected={key === filters.status}>{label}</option>
                ))}
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label small text-muted">Severite</label>
              <select name="severity" class="form-select">
                <option value="">Toutes</option>
                {Object.entries(recetteSeverityLabels).map(([key, { label }]) => (
                  <option value={key} selected={key === filters.severity}>{label}</option>
                ))}
              </select>
            </div>
            <div class="col-auto">
              <button type="submit" class="btn btn-outline-primary">
                <i class="bi bi-funnel me-1"></i>Filtrer
              </button>
              {hasFilters && (
                <a href="/backoffice/recette" class="btn btn-outline-secondary ms-2">
                  <i class="bi bi-x-lg"></i>
                </a>
              )}
            </div>
            <div class="col-auto ms-auto">
              <form method="post" action="/backoffice/recette/seed">
                <button type="submit" class="btn btn-outline-secondary" title="Resynchroniser le catalogue depuis le code">
                  <i class="bi bi-arrow-repeat me-1"></i>Resync catalogue
                </button>
              </form>
            </div>
          </form>
        </div>
      </div>

      <div class="accordion" id="recette-apps">
        {appOrder
          .filter((app) => byApp.has(app))
          .map((app) => {
            const modules = byApp.get(app)!;
            const appOpenCount = Array.from(modules.values())
              .flat()
              .reduce(
                (acc, f) =>
                  acc +
                  f.feedback.filter(
                    (x) => x.status === 'ouvert' || x.status === 'a_revoir'
                  ).length,
                0
              );
            const headingId = `app-heading-${app}`;
            const bodyId = `app-body-${app}`;
            return (
              <div class="accordion-item mb-3" style="border-radius:10px;overflow:hidden;">
                <h2 class="accordion-header" id={headingId}>
                  <button
                    class="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#${bodyId}`}
                  >
                    <i class={`bi ${appIcons[app]} me-2`}></i>
                    <span class="fw-600">{recetteAppLabels[app]}</span>
                    <span class="badge bg-secondary ms-2">
                      {Array.from(modules.values()).flat().length} features
                    </span>
                    {appOpenCount > 0 && (
                      <span class="badge bg-danger ms-2">{appOpenCount} ouverts</span>
                    )}
                  </button>
                </h2>
                <div
                  id={bodyId}
                  class="accordion-collapse collapse"
                  data-bs-parent="#recette-apps"
                >
                  <div class="accordion-body" style="background:#f5f7fa;">
                    {Array.from(modules.entries()).map(([moduleName, feats]) => (
                      <div class="mb-4">
                        <h6 class="text-uppercase text-muted fw-600 mb-2" style="letter-spacing:0.5px;font-size:0.75rem;">
                          {moduleName}
                        </h6>
                        {feats.map((feature) => (
                          <FeatureCard
                            feature={feature}
                            currentUserName={`${user.firstName} ${user.lastName}`}
                            isAdminRoute={app === 'admin'}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </Layout>
  );
};
