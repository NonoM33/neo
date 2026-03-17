import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button } from '../../components';
import { leadsService } from '../../services';
import type { Lead, LeadStatus, LeadFilter } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, PIPELINE_STAGES } from '../../types';
import { useGamificationStore } from '../../stores';
import { QualificationBadge } from '../../components/prospection';

export function LeadsPage() {
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [filter] = useState<LeadFilter>({});

  useEffect(() => {
    loadLeads();
  }, [filter]);

  const loadLeads = async () => {
    try {
      const response = await leadsService.getLeads(filter, 1, 100);
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status);
  };

  const formatCurrency = (value?: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await leadsService.changeStatus(leadId, { status: newStatus });

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
          gamification.awardXP('lead_won');
          break;
      }

      loadLeads();
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="leads-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="btn-group">
          <button
            className={`btn ${view === 'kanban' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setView('kanban')}
          >
            <i className="bi bi-kanban me-1"></i>
            Kanban
          </button>
          <button
            className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setView('list')}
          >
            <i className="bi bi-list me-1"></i>
            Liste
          </button>
        </div>

        <Button icon="bi-plus-lg" onClick={() => navigate('/leads/new')}>
          Nouveau lead
        </Button>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="row g-3">
          {PIPELINE_STAGES.map((status) => (
            <div key={status} className="col-md-6 col-xl-3">
              <Card className="kanban-column h-100">
                <CardHeader className={`badge-${status}`} style={{ color: '#fff', borderRadius: 'var(--neo-radius-md) var(--neo-radius-md) 0 0' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{LEAD_STATUS_LABELS[status]}</span>
                    <span className="badge bg-white text-dark">{getLeadsByStatus(status).length}</span>
                  </div>
                </CardHeader>
                <CardBody className="p-2">
                  {getLeadsByStatus(status).map((lead) => {
                    const isHighValue = lead.estimatedValue && parseFloat(lead.estimatedValue) >= 20000;
                    return (
                      <div
                        key={lead.id}
                        className="card kanban-card mb-2"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        style={isHighValue ? {
                          borderLeft: '3px solid var(--neo-xp-color)',
                        } : undefined}
                      >
                        <div className="card-body p-3">
                          <h6 className="mb-1">{lead.firstName} {lead.lastName}</h6>
                          <div className="d-flex align-items-center gap-1 mb-2">
                            <p className="text-muted small mb-0" style={{ flex: 1 }}>{lead.title}</p>
                            <QualificationBadge lead={lead} />
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">{LEAD_SOURCE_LABELS[lead.source]}</small>
                            <strong className="text-primary">{formatCurrency(lead.estimatedValue)}</strong>
                          </div>
                          {lead.probability !== undefined && (
                            <div className="progress progress-neo mt-2">
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${lead.probability}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {getLeadsByStatus(status).length === 0 && (
                    <div className="text-center text-muted py-4">
                      <i className="bi bi-inbox fs-4"></i>
                      <p className="mb-0 small">Aucun lead</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardBody className="p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Projet</th>
                    <th>Source</th>
                    <th>Statut</th>
                    <th>Valeur</th>
                    <th>Probabilité</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <strong>{lead.firstName} {lead.lastName}</strong>
                        {lead.company && <div className="text-muted small">{lead.company}</div>}
                      </td>
                      <td>{lead.title}</td>
                      <td>{LEAD_SOURCE_LABELS[lead.source]}</td>
                      <td>
                        <span className={`badge badge-${lead.status}`}>{LEAD_STATUS_LABELS[lead.status]}</span>
                      </td>
                      <td>{formatCurrency(lead.estimatedValue)}</td>
                      <td>{lead.probability !== undefined ? `${lead.probability}%` : '-'}</td>
                      <td>
                        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu">
                            <li>
                              <button className="dropdown-item" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                                <i className="bi bi-pencil me-2"></i>Modifier
                              </button>
                            </li>
                            {lead.status !== 'gagne' && lead.status !== 'perdu' && (
                              <>
                                <li><hr className="dropdown-divider" /></li>
                                {PIPELINE_STAGES.filter((s) => s !== lead.status).map((status) => (
                                  <li key={status}>
                                    <button
                                      className="dropdown-item"
                                      onClick={() => handleStatusChange(lead.id, status)}
                                    >
                                      Passer à {LEAD_STATUS_LABELS[status]}
                                    </button>
                                  </li>
                                ))}
                              </>
                            )}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default LeadsPage;
