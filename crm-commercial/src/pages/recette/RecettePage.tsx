import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Icon, Pill } from '../../components/neo';
import { recetteService } from '../../services';
import type {
  CreateRecetteFeedbackInput,
  RecetteApp,
  RecetteFeature,
  RecetteSeverity,
  RecetteStatus,
  RecetteSummary,
  RecetteValidation,
} from '../../types/recette.types';
import { APP_LABELS, SEVERITY_META, STATUS_META, VALIDATION_META } from './recette.meta';
import { FeedbackFormModal } from './FeedbackFormModal';

const STATUS_OPTIONS = Object.keys(STATUS_META) as RecetteStatus[];
const VALIDATION_OPTIONS = Object.keys(VALIDATION_META) as RecetteValidation[];

export function RecettePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RecetteSummary | null>(null);
  const [features, setFeatures] = useState<RecetteFeature[]>([]);
  const [appFilter, setAppFilter] = useState<RecetteApp | ''>('');
  const [statusFilter, setStatusFilter] = useState<RecetteStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<RecetteSeverity | ''>('');
  const [validationFilter, setValidationFilter] = useState<RecetteValidation | ''>('');
  const [modalFeature, setModalFeature] = useState<RecetteFeature | null>(null);

  const reload = useCallback(async () => {
    const [sum, cat] = await Promise.all([
      recetteService.getSummary(),
      recetteService.getCatalogue({
        app: appFilter || undefined,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        validation: validationFilter || undefined,
      }),
    ]);
    setSummary(sum);
    setFeatures(cat);
  }, [appFilter, statusFilter, severityFilter, validationFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch (error) {
        console.error('Failed to load recette:', error);
        if (!cancelled) toast.error('Impossible de charger la recette');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const handleValidationChange = async (feature: RecetteFeature, value: RecetteValidation) => {
    try {
      await recetteService.updateFeatureValidation(feature.id, value);
      toast.success('Validation mise à jour');
      await reload();
    } catch {
      toast.error('Échec de la mise à jour');
    }
  };

  const handleStatusChange = async (feedbackId: string, value: RecetteStatus) => {
    try {
      await recetteService.updateFeedbackStatus(feedbackId, value);
      toast.success('Statut mis à jour');
      await reload();
    } catch {
      toast.error('Échec de la mise à jour');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!window.confirm('Supprimer ce retour ?')) return;
    try {
      await recetteService.deleteFeedback(feedbackId);
      toast.success('Retour supprimé');
      await reload();
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  const handleCreateFeedback = async (
    input: Omit<CreateRecetteFeedbackInput, 'featureId'>,
  ) => {
    if (!modalFeature) return;
    try {
      await recetteService.createFeedback({ ...input, featureId: modalFeature.id });
      setModalFeature(null);
      toast.success('Retour enregistré');
      await reload();
    } catch {
      toast.error("Échec de l'enregistrement");
    }
  };

  const resetFilters = () => {
    setAppFilter('');
    setStatusFilter('');
    setSeverityFilter('');
    setValidationFilter('');
  };

  const hasFilters = appFilter || statusFilter || severityFilter || validationFilter;

  if (loading) return <Spinner />;

  return (
    <div className="recette-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Centre de recette</h1>
          <p>Suivi des features à tester et des retours (STG / dev uniquement).</p>
        </div>
      </div>

      {summary && (
        <div className="stat-grid mb-22">
          <div className="stat">
            <div className="st-top">
              <span className="st-label">Features</span>
            </div>
            <div className="st-val">{summary.totalFeatures}</div>
          </div>
          <div className="stat">
            <div className="st-top">
              <span className="st-label">Avec retours ouverts</span>
            </div>
            <div className="st-val">{summary.featuresWithOpenIssues}</div>
          </div>
          <div className="stat">
            <div className="st-top">
              <span className="st-label">Retours total</span>
            </div>
            <div className="st-val">{summary.totalFeedback}</div>
          </div>
          <div className="stat">
            <div className="st-top">
              <span className="st-label">Validées</span>
            </div>
            <div className="st-val">{summary.byValidation.valide}</div>
          </div>
        </div>
      )}

      <Card>
        <div className="fbar">
          <select
            className="neo-field"
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value as RecetteApp | '')}
            style={{ width: 180 }}
          >
            <option value="">Toutes les apps</option>
            {(Object.keys(APP_LABELS) as RecetteApp[]).map((a) => (
              <option key={a} value={a}>
                {APP_LABELS[a]}
              </option>
            ))}
          </select>
          <select
            className="neo-field"
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value as RecetteValidation | '')}
            style={{ width: 160 }}
          >
            <option value="">Toutes validations</option>
            {VALIDATION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {VALIDATION_META[v].label}
              </option>
            ))}
          </select>
          <select
            className="neo-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RecetteStatus | '')}
            style={{ width: 150 }}
          >
            <option value="">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            className="neo-field"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as RecetteSeverity | '')}
            style={{ width: 150 }}
          >
            <option value="">Toutes sévérités</option>
            {(Object.keys(SEVERITY_META) as RecetteSeverity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <Btn variant="subtle" icon="x" onClick={resetFilters}>
              Réinitialiser
            </Btn>
          )}
        </div>
      </Card>

      {features.length === 0 ? (
        <Card>
          <div className="empty">Aucune feature ne correspond aux filtres.</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
          {features.map((feature) => {
            const vMeta = VALIDATION_META[feature.validationStatus];
            return (
              <Card key={feature.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginBottom: feature.feedback.length ? 12 : 0,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Pill tone="info">{APP_LABELS[feature.app]}</Pill>
                      <span className="t-sub">{feature.module}</span>
                    </div>
                    <div className="t-main" style={{ marginTop: 4 }}>
                      {feature.title}
                    </div>
                    {feature.route && <div className="t-sub t-mono">{feature.route}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Pill tone={vMeta.tone}>{vMeta.label}</Pill>
                    <select
                      className="neo-field"
                      value={feature.validationStatus}
                      onChange={(e) =>
                        handleValidationChange(feature, e.target.value as RecetteValidation)
                      }
                      style={{ width: 140 }}
                    >
                      {VALIDATION_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {VALIDATION_META[v].label}
                        </option>
                      ))}
                    </select>
                    <Btn
                      variant="subtle"
                      size="sm"
                      icon="plus"
                      onClick={() => setModalFeature(feature)}
                    >
                      Retour
                    </Btn>
                  </div>
                </div>

                {feature.feedback.length > 0 && (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Retour</th>
                          <th>Sévérité</th>
                          <th>Statut</th>
                          <th>Auteur</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {feature.feedback.map((fb) => {
                          const sMeta = SEVERITY_META[fb.severity];
                          return (
                            <tr key={fb.id}>
                              <td>
                                <div className="t-main">{fb.title}</div>
                                {fb.actualResult && (
                                  <div className="t-sub">{fb.actualResult}</div>
                                )}
                                {fb.gitlabIssueUrl && (
                                  <a
                                    className="t-sub"
                                    href={fb.gitlabIssueUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Issue #{fb.gitlabIssueIid}
                                  </a>
                                )}
                              </td>
                              <td>
                                <Pill tone={sMeta.tone}>{sMeta.label}</Pill>
                              </td>
                              <td>
                                <select
                                  className="neo-field"
                                  value={fb.status}
                                  onChange={(e) =>
                                    handleStatusChange(fb.id, e.target.value as RecetteStatus)
                                  }
                                  style={{ width: 130 }}
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                      {STATUS_META[s].label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="t-sub">{fb.author}</td>
                              <td style={{ textAlign: 'right' }}>
                                <Btn
                                  variant="danger-ghost"
                                  size="sm"
                                  icon="trash"
                                  onClick={() => handleDeleteFeedback(fb.id)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {feature.feedback.length === 0 && (
                  <div className="t-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={14} />
                    Aucun retour pour cette feature.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <FeedbackFormModal
        open={modalFeature !== null}
        featureTitle={modalFeature?.title ?? ''}
        onClose={() => setModalFeature(null)}
        onSubmit={handleCreateFeedback}
      />
    </div>
  );
}

export default RecettePage;
