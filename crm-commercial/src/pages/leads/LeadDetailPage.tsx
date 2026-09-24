import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Pill, Icon } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { leadsService } from '../../services';
import type { LeadWithDetails, LeadStatus, ActivityStatus } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, ACTIVITY_TYPE_LABELS, PIPELINE_STAGES } from '../../types';
import { useGamificationStore } from '../../stores';
import { XPIndicator } from '../../components/gamification';
import { ScoreGauge, ScoreBreakdown, SuggestionsList, QuickActionBar } from '../../components/prospection';
import { CallRecorderWidget, CallHistoryList } from '../../components/calls';
import { computeLeadScore } from '../../services/scoring.engine';
import { generateSuggestions } from '../../services/suggestions.engine';

const STATUS_TONE: Record<LeadStatus, PillTone> = {
  prospect: 'neutral',
  qualifie: 'info',
  proposition: 'info',
  negociation: 'warning',
  gagne: 'success',
  perdu: 'danger',
};

const ACTIVITY_STATUS_TONE: Record<string, PillTone> = {
  termine: 'success',
  annule: 'neutral',
  planifie: 'info',
};

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<LeadWithDetails | null>(null);
  const [converting, setConverting] = useState(false);

  const loadLead = useCallback(async () => {
    try {
      const data = await leadsService.getLead(id!);
      setLead(data);
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadLead();
  }, [id, loadLead]);

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
        case 'gagne': {
          const bonusXP = lead.estimatedValue
            ? parseFloat(lead.estimatedValue) >= 50000
              ? 100
              : parseFloat(lead.estimatedValue) >= 20000
                ? 50
                : parseFloat(lead.estimatedValue) >= 10000
                  ? 25
                  : 0
            : 0;
          gamification.awardXP('lead_won', bonusXP);
          break;
        }
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
      const result = await leadsService.convertLead(lead.id, { createClient: true });
      // Projects are managed in the integrateur app (Flutter), not in the
      // CRM, so we stay on the lead detail (now status=gagne) and surface
      // the new project id in the toast.
      toast.success(`Lead converti — projet créé`, {
        description: `Identifiant du projet : ${result.projectId.slice(0, 8)}…`,
        action: {
          label: "Copier l'ID",
          onClick: () => {
            void navigator.clipboard?.writeText(result.projectId);
            toast.message('ID copié dans le presse-papiers');
          },
        },
        duration: 8000,
      });
      loadLead();
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast.error('La conversion a échoué');
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getXPPotential = () => {
    if (!lead) return 0;
    let xp = 0;
    const stages: LeadStatus[] = ['qualifie', 'proposition', 'negociation', 'gagne'];
    const stageIndex = stages.indexOf(lead.status);
    for (let i = stageIndex + 1; i < stages.length; i++) {
      switch (stages[i]) {
        case 'qualifie':
          xp += 25;
          break;
        case 'proposition':
          xp += 50;
          break;
        case 'negociation':
          xp += 75;
          break;
        case 'gagne':
          xp += 200;
          break;
      }
    }
    return xp;
  };

  if (loading) {
    return <Spinner />;
  }

  if (!lead) {
    return (
      <div style={{ padding: 28 }}>
        <div className="empty">
          <span className="em-ic">
            <Icon name="bug" size={24} />
          </span>
          <b>Lead non trouvé</b>
          <div style={{ marginTop: 14 }}>
            <Btn onClick={() => navigate('/leads')}>Retour aux leads</Btn>
          </div>
        </div>
      </div>
    );
  }

  const isWonOrLost = lead.status === 'gagne' || lead.status === 'perdu';
  const xpPotential = getXPPotential();

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/leads')}>
            <Icon name="arrowLeft" size={15} /> Retour aux leads
          </button>
          <h1>
            {lead.firstName} {lead.lastName}
          </h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead.title}
            {!isWonOrLost && xpPotential > 0 && <XPIndicator xp={xpPotential} size="sm" />}
          </p>
        </div>
        {!isWonOrLost && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" icon="edit" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
              Modifier
            </Btn>
            <Btn variant="success" icon="trophy" disabled={converting} onClick={handleConvert}>
              {converting ? 'Conversion…' : 'Convertir en projet'}
            </Btn>
          </div>
        )}
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card>
            <div
              className="card-body"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ink-3)' }}>Statut :</span>
                <Pill tone={STATUS_TONE[lead.status]} dot>
                  {LEAD_STATUS_LABELS[lead.status]}
                </Pill>
              </div>
              {!isWonOrLost && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PIPELINE_STAGES.map((status) => (
                    <Btn
                      key={status}
                      size="sm"
                      variant={lead.status === status ? 'primary' : 'ghost'}
                      disabled={lead.status === status}
                      onClick={() => handleStatusChange(status)}
                    >
                      {LEAD_STATUS_LABELS[status]}
                    </Btn>
                  ))}
                  <Btn size="sm" variant="success" icon="trophy" onClick={() => handleStatusChange('gagne')}>
                    Gagné +200 XP
                  </Btn>
                  <Btn size="sm" variant="danger-ghost" icon="x" onClick={() => handleStatusChange('perdu')}>
                    Perdu
                  </Btn>
                </div>
              )}
            </div>
          </Card>

          {lead.description && (
            <Card head="Description" icon="fileText">
              <div className="card-body">
                <p style={{ margin: 0, lineHeight: 1.6 }}>{lead.description}</p>
              </div>
            </Card>
          )}

          <Card
            head="Activités"
            icon="calendar"
            action={
              <Btn size="sm" icon="plus" onClick={() => navigate(`/activities/new?leadId=${lead.id}`)}>
                Ajouter
              </Btn>
            }
            flush
          >
            {lead.activities && lead.activities.length > 0 ? (
              <div className="tbl-wrap">
              <table className="tbl">
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
                        <Pill tone="neutral">{ACTIVITY_TYPE_LABELS[activity.type]}</Pill>
                      </td>
                      <td>{activity.subject}</td>
                      <td>{activity.scheduledAt ? formatDate(activity.scheduledAt) : '-'}</td>
                      <td>
                        <Pill tone={ACTIVITY_STATUS_TONE[activity.status as ActivityStatus] ?? 'info'}>
                          {activity.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <div className="empty">
                <span className="em-ic">
                  <Icon name="calendar" size={22} />
                </span>
                <b>Aucune activité</b>
              </div>
            )}
          </Card>

          <Card head="Enregistrements d'appels" icon="phone">
            <div className="card-body">
              <CallRecorderWidget leadId={lead.id} onCallComplete={() => loadLead()} />
            </div>
          </Card>

          <CallHistoryList leadId={lead.id} />

          <Card head="Historique" icon="clock">
            <div className="card-body">
              {lead.stageHistory && lead.stageHistory.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {lead.stageHistory.map((entry) => (
                    <li key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ color: 'var(--komun)', marginTop: 2 }}>
                        <Icon name="arrowRight" size={16} />
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {entry.fromStatus && (
                            <>
                              <Pill tone={STATUS_TONE[entry.fromStatus]}>{LEAD_STATUS_LABELS[entry.fromStatus]}</Pill>
                              <Icon name="arrowRight" size={13} />
                            </>
                          )}
                          <Pill tone={STATUS_TONE[entry.toStatus]}>{LEAD_STATUS_LABELS[entry.toStatus]}</Pill>
                        </div>
                        <small style={{ color: 'var(--ink-3)' }}>{formatDate(entry.changedAt)}</small>
                        {entry.notes && (
                          <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '4px 0 0' }}>{entry.notes}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--ink-3)', margin: 0 }}>Aucun historique</p>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!isWonOrLost &&
            (() => {
              const score = computeLeadScore(lead, lead.activities || []);
              const suggestions = generateSuggestions(lead, lead.activities || []);
              return (
                <>
                  <Card
                    head="Score prospect"
                    icon="gauge"
                    action={
                      !lead.qualification ? (
                        <Btn size="sm" variant="ghost" onClick={() => navigate(`/prospection/qualify/${lead.id}`)}>
                          Qualifier
                        </Btn>
                      ) : undefined
                    }
                  >
                    <div className="card-body">
                      <div style={{ textAlign: 'center', marginBottom: 14 }}>
                        <ScoreGauge score={score} size="md" />
                      </div>
                      <ScoreBreakdown breakdown={score.breakdown} />
                      {lead.qualification && (
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                          <Btn
                            size="sm"
                            variant="subtle"
                            icon="edit"
                            onClick={() => navigate(`/prospection/qualify/${lead.id}`)}
                          >
                            Modifier qualification
                          </Btn>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card head="Actions rapides" icon="zap">
                    <div className="card-body">
                      <QuickActionBar leadId={lead.id} />
                    </div>
                  </Card>

                  {suggestions.length > 0 && (
                    <Card>
                      <div className="card-body">
                        <SuggestionsList suggestions={suggestions} maxItems={3} />
                      </div>
                    </Card>
                  )}
                </>
              );
            })()}

          <Card head="Contact" icon="user">
            <div className="card-body">
              <dl className="detail-dl">
                {lead.email && (
                  <>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    </dd>
                  </>
                )}
                {lead.phone && (
                  <>
                    <dt>Téléphone</dt>
                    <dd>
                      <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                    </dd>
                  </>
                )}
                {lead.company && (
                  <>
                    <dt>Entreprise</dt>
                    <dd>{lead.company}</dd>
                  </>
                )}
              </dl>
            </div>
          </Card>

          <Card head="Projet" icon="target">
            <div className="card-body">
              <dl className="detail-dl">
                <dt>Source</dt>
                <dd>{LEAD_SOURCE_LABELS[lead.source]}</dd>

                <dt>Valeur estimée</dt>
                <dd style={{ fontSize: 18, fontWeight: 700, color: 'var(--komun)' }}>
                  {formatCurrency(lead.estimatedValue)}
                </dd>

                {lead.probability !== undefined && (
                  <>
                    <dt>Probabilité</dt>
                    <dd>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 4,
                            background: 'var(--line)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{ width: `${lead.probability}%`, height: '100%', background: 'var(--komun)' }}
                          />
                        </div>
                        <span>{lead.probability}%</span>
                      </div>
                    </dd>
                  </>
                )}

                {lead.expectedCloseDate && (
                  <>
                    <dt>Date de clôture prévue</dt>
                    <dd>{new Date(lead.expectedCloseDate).toLocaleDateString('fr-FR')}</dd>
                  </>
                )}
              </dl>
            </div>
          </Card>

          {(lead.address || lead.city || lead.postalCode) && (
            <Card head="Adresse" icon="building">
              <div className="card-body">
                {lead.address && <p style={{ margin: '0 0 4px' }}>{lead.address}</p>}
                {(lead.postalCode || lead.city) && (
                  <p style={{ margin: 0 }}>
                    {lead.postalCode} {lead.city}
                  </p>
                )}
                {lead.surface && (
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '8px 0 0' }}>Surface : {lead.surface} m²</p>
                )}
              </div>
            </Card>
          )}

          <Card>
            <div className="card-body">
              <small style={{ color: 'var(--ink-3)' }}>
                Créé le {formatDate(lead.createdAt)}
                <br />
                Mis à jour le {formatDate(lead.updatedAt)}
              </small>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LeadDetailPage;
