import type { FC } from 'hono/jsx';
import {
  recetteSeverityLabels,
  recetteStatusLabels,
  recetteValidationLabels,
} from '../../../db/schema';
import type { RecetteSummary } from '../../../modules/recette/recette.service';

interface SummaryBarProps {
  summary: RecetteSummary;
}

export const SummaryBar: FC<SummaryBarProps> = ({ summary }) => {
  const statusColors: Record<string, string> = {
    ouvert: '#dc3545',
    corrige: '#0dcaf0',
    valide: '#198754',
    a_revoir: '#ffc107',
  };

  const validatedPct = summary.totalFeatures
    ? Math.round((summary.byValidation.valide / summary.totalFeatures) * 100)
    : 0;

  return (
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="stat-card" style="background: linear-gradient(135deg, #1a1d21 0%, #2d3339 100%);">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="stat-value">{summary.totalFeatures}</div>
              <div class="stat-label">Features a recetter</div>
            </div>
            <i class="bi bi-list-check stat-icon"></i>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card" style="background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%);">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="stat-value">{summary.featuresWithOpenIssues}</div>
              <div class="stat-label">Features avec retours ouverts</div>
            </div>
            <i class="bi bi-bug stat-icon"></i>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card" style="background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="stat-value">{summary.totalFeedback}</div>
              <div class="stat-label">Retours total</div>
            </div>
            <i class="bi bi-chat-left-text stat-icon"></i>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card" style="background: linear-gradient(135deg, #198754 0%, #146c43 100%);">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="stat-value">
                {summary.byValidation.valide}/{summary.totalFeatures}
              </div>
              <div class="stat-label">Features recettees</div>
            </div>
            <i class="bi bi-check2-circle stat-icon"></i>
          </div>
          <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.25);overflow:hidden;margin-top:10px;">
            <div
              style={`height:100%;border-radius:3px;background:#fff;width:${validatedPct}%;`}
            ></div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card">
          <div class="card-body d-flex flex-wrap gap-3 align-items-center">
            <span class="text-muted small fw-600 text-uppercase">Par statut</span>
            {Object.entries(recetteStatusLabels).map(([key, { label }]) => (
              <span class="d-inline-flex align-items-center gap-2">
                <span
                  style={`display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusColors[key]}`}
                ></span>
                <span class="small">
                  {label} : <strong>{summary.byStatus[key as keyof typeof summary.byStatus]}</strong>
                </span>
              </span>
            ))}
            <span class="vr"></span>
            <span class="text-muted small fw-600 text-uppercase">Par severite</span>
            {Object.entries(recetteSeverityLabels).map(([key, { label, color }]) => (
              <span class="small">
                <span class={`badge bg-${color}`}>{label}</span>{' '}
                <strong>{summary.bySeverity[key as keyof typeof summary.bySeverity]}</strong>
              </span>
            ))}
            <span class="vr"></span>
            <span class="text-muted small fw-600 text-uppercase">Recettage</span>
            {Object.entries(recetteValidationLabels).map(([key, { label, color, icon }]) => (
              <span class="small">
                <span class={`badge bg-${color}`}>
                  <i class={`bi ${icon} me-1`}></i>{label}
                </span>{' '}
                <strong>{summary.byValidation[key as keyof typeof summary.byValidation]}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
