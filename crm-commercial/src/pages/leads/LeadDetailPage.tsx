import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button } from '../../components';
import { leadsService } from '../../services';
import type { LeadWithDetails, LeadStatus } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, ACTIVITY_TYPE_LABELS, PIPELINE_STAGES } from '../../types';
import { useGamificationStore } from '../../stores';
import { XPIndicator } from '../../components/gamification';
import { ScoreGauge, ScoreBreakdown, SuggestionsList, QuickActionBar } from '../../components/prospection';
import { CallRecorderWidget, CallHistoryList } from '../../components/calls';
import { computeLeadScore } from '../../services/scoring.engine';
import { generateSuggestions } from '../../services/suggestions.engine';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadWithDetails | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const data = await leadsService.getLead(id!);
      setLead(data);
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    try {
      await leadsService.changeStatus(lead.id, { status: newStatus });

      // Award XP based on status
      switch (newStatus) {
        case 'qualifie':
          gamification.awardXP('lead_qualified');
          break;
        case 'proposition':
          gamification.awardXP('lead_proposition');
          break;
        case 'negociation':
          gamification.awardXP('lead_negociation');
          break;
        case 'gagne':
          const bonusXP = lead.estimatedValue
            ? parseFloat(lead.estimatedValue) >= 50000 ? 100
              : parseFloat(lead.estimatedValue) >= 20000 ? 50
              : parseFloat(lead.estimatedValue) >= 10000 ? 25 : 0
            : 0;
          gamification.awardXP('lead_won', bonusXP);
          break;
      }

      loadLead();
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  const handleConvert = async () => {
    if (!lead) return;
    setConverting(true);
    try {
      await leadsService.convertLead(lead.id, { createClient: true });
      navigate(`/leads/${lead.id}`);
      loadLead();
    } catch (error) {
      console.error('Failed to convert lead:', error);
    } finally {
      setConverting(false);
    }
  };

  const formatCurrency = (value?: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // XP potential for this deal
  const getXPPotential = () => {
    if (!lead) return 0;
    let xp = 0;
    const stages: LeadStatus[] = ['qualifie', 'proposition', 'negociation', 'gagne'];
    const stageIndex = stages.indexOf(lead.status);
    for (let i = stageIndex + 1; i < stages.length; i++) {
      switch (stages[i]) {
        case 'qualifie': xp += 25; break;
        case 'proposition': xp += 50; break;
        case 'negociation': xp += 75; break;
        case 'gagne': xp += 200; break;
      }
    }
    return xp;
  };

  if (loading) {
    return <Spinner />;
  }

  if (!lead) {
    return (
      <div className="empty-state">
        <i className="bi bi-exclamation-triangle"></i>
        <p>Lead non trouvé</p>
        <Button onClick={() => navigate('/leads')}>Retour aux leads</Button>
      </div>
    );
  }

  const isWonOrLost = lead.status === 'gagne' || lead.status === 'perdu';
  const xpPotential = getXPPotential();

  return (
    <div className="lead-detail">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate('/leads')}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour aux leads
          </button>
          <h2 className="mb-1">{lead.firstName} {lead.lastName}</h2>
          <div className="d-flex align-items-center gap-2">
            <p className="text-muted mb-0">{lead.title}</p>
            {!isWonOrLost && xpPotential > 0 && (
              <XPIndicator xp={xpPotential} size="sm" />
            )}
          </div>
        </div>
        <div className="d-flex gap-2">
          {!isWonOrLost && (
            <>
              <Button variant="outline-primary" icon="bi-pencil" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                Modifier
              </Button>
              <Button variant="success" icon="bi-trophy" loading={converting} onClick={handleConvert}>
                Convertir en projet
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Main Info */}
        <div className="col-lg-8">
          {/* Status & Actions */}
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted me-2">Statut:</span>
                  <span className={`badge badge-${lead.status} fs-6`}>{LEAD_STATUS_LABELS[lead.status]}</span>
                </div>
                {!isWonOrLost && (
                  <div className="btn-group">
                    {PIPELINE_STAGES.map((status) => (
                      <button
                        key={status}
                        className={`btn btn-sm ${lead.status === status ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleStatusChange(status)}
                        disabled={lead.status === status}
                      >
                        {LEAD_STATUS_LABELS[status]}
                      </button>
                    ))}
                    <button className="btn btn-sm btn-outline-success" onClick={() => handleStatusChange('gagne')}>
                      <i className="bi bi-trophy me-1"></i>Gagné
                      <span className="ms-1" style={{ fontSize: '0.7rem', opacity: 0.8 }}>+200 XP</span>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange('perdu')}>
                      <i className="bi bi-x-lg me-1"></i>Perdu
                    </button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Description */}
          {lead.description && (
            <Card className="mb-4">
              <CardHeader>Description</CardHeader>
              <CardBody>
                <p className="mb-0">{lead.description}</p>
              </CardBody>
            </Card>
          )}

          {/* Activities */}
          <Card className="mb-4">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>Activités</span>
                <Button size="sm" icon="bi-plus-lg" onClick={() => navigate(`/activities/new?leadId=${lead.id}`)}>
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {lead.activities && lead.activities.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Sujet</th>
                        <th>Date</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lead.activities.map((activity) => (
                        <tr key={activity.id}>
                          <td>
                            <span className={`badge badge-${activity.type}`}>
                              {ACTIVITY_TYPE_LABELS[activity.type]}
                            </span>
                          </td>
                          <td>{activity.subject}</td>
                          <td>{activity.scheduledAt ? formatDate(activity.scheduledAt) : '-'}</td>
                          <td>
                            <span className={`badge ${activity.status === 'termine' ? 'bg-success' : activity.status === 'annule' ? 'bg-secondary' : 'bg-info'}`}>
                              {activity.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-4">
                  <i className="bi bi-calendar-x"></i>
                  <p className="mb-0">Aucune activité</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Enregistrements d'appels */}
          <Card className="mb-4">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-mic me-2"></i>
                  Enregistrements d'appels
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <CallRecorderWidget leadId={lead.id} onCallComplete={() => loadLead()} />
            </CardBody>
          </Card>

          <div className="mb-4">
            <CallHistoryList leadId={lead.id} />
          </div>

          {/* Stage History */}
          <Card>
            <CardHeader>Historique</CardHeader>
            <CardBody>
              {lead.stageHistory && lead.stageHistory.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {lead.stageHistory.map((entry) => (
                    <li key={entry.id} className="d-flex align-items-start mb-3">
                      <div className="me-3">
                        <i className="bi bi-arrow-right-circle text-primary"></i>
                      </div>
                      <div>
                        <div>
                          {entry.fromStatus ? (
                            <>
                              <span className={`badge badge-${entry.fromStatus} me-1`}>{LEAD_STATUS_LABELS[entry.fromStatus]}</span>
                              <i className="bi bi-arrow-right mx-1"></i>
                            </>
                          ) : null}
                          <span className={`badge badge-${entry.toStatus}`}>{LEAD_STATUS_LABELS[entry.toStatus]}</span>
                        </div>
                        <small className="text-muted">{formatDate(entry.changedAt)}</small>
                        {entry.notes && <p className="text-muted small mb-0 mt-1">{entry.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">Aucun historique</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Score & Quick Actions */}
          {!isWonOrLost && (() => {
            const score = computeLeadScore(lead, lead.activities || []);
            const suggestions = generateSuggestions(lead, lead.activities || []);
            return (
              <>
                <Card className="mb-4">
                  <CardHeader>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Score prospect</span>
                      {!lead.qualification && (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => navigate(`/prospection/qualify/${lead.id}`)}
                        >
                          Qualifier
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="text-center mb-3">
                      <ScoreGauge score={score} size="md" />
                    </div>
                    <ScoreBreakdown breakdown={score.breakdown} />
                    {lead.qualification && (
                      <div className="mt-2 text-center">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => navigate(`/prospection/qualify/${lead.id}`)}
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Modifier qualification
                        </button>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Quick Actions */}
                <Card className="mb-4">
                  <CardHeader>Actions rapides</CardHeader>
                  <CardBody>
                    <QuickActionBar leadId={lead.id} />
                  </CardBody>
                </Card>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <Card className="mb-4">
                    <CardBody>
                      <SuggestionsList suggestions={suggestions} maxItems={3} />
                    </CardBody>
                  </Card>
                )}
              </>
            );
          })()}

          {/* Contact Info */}
          <Card className="mb-4">
            <CardHeader>Contact</CardHeader>
            <CardBody>
              <dl className="mb-0">
                {lead.email && (
                  <>
                    <dt className="text-muted small">Email</dt>
                    <dd>
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    </dd>
                  </>
                )}
                {lead.phone && (
                  <>
                    <dt className="text-muted small">Téléphone</dt>
                    <dd>
                      <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                    </dd>
                  </>
                )}
                {lead.company && (
                  <>
                    <dt className="text-muted small">Entreprise</dt>
                    <dd>{lead.company}</dd>
                  </>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Project Info */}
          <Card className="mb-4">
            <CardHeader>Projet</CardHeader>
            <CardBody>
              <dl className="mb-0">
                <dt className="text-muted small">Source</dt>
                <dd>{LEAD_SOURCE_LABELS[lead.source]}</dd>

                <dt className="text-muted small">Valeur estimée</dt>
                <dd className="h5 text-primary">{formatCurrency(lead.estimatedValue)}</dd>

                {lead.probability !== undefined && (
                  <>
                    <dt className="text-muted small">Probabilité</dt>
                    <dd>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress progress-neo flex-grow-1">
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${lead.probability}%` }}
                          ></div>
                        </div>
                        <span>{lead.probability}%</span>
                      </div>
                    </dd>
                  </>
                )}

                {lead.expectedCloseDate && (
                  <>
                    <dt className="text-muted small">Date de clôture prévue</dt>
                    <dd>{new Date(lead.expectedCloseDate).toLocaleDateString('fr-FR')}</dd>
                  </>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Location */}
          {(lead.address || lead.city || lead.postalCode) && (
            <Card className="mb-4">
              <CardHeader>Adresse</CardHeader>
              <CardBody>
                {lead.address && <p className="mb-1">{lead.address}</p>}
                {(lead.postalCode || lead.city) && (
                  <p className="mb-0">
                    {lead.postalCode} {lead.city}
                  </p>
                )}
                {lead.surface && (
                  <p className="text-muted small mt-2 mb-0">
                    Surface: {lead.surface} m²
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardBody>
              <small className="text-muted">
                Créé le {formatDate(lead.createdAt)}
                <br />
                Mis à jour le {formatDate(lead.updatedAt)}
              </small>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LeadDetailPage;
