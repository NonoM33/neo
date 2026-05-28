import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Spinner, Button } from '../../components';
import { LeadsFilters, LeadKanban } from '../../components/leads';
import { leadsService } from '../../services';
import type { Lead, LeadStatus } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, PIPELINE_STAGES } from '../../types';
import { useGamificationStore, useLeadsStore } from '../../stores';

export function LeadsPage() {
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const filter = useLeadsStore((s) => s.filter);
  const view = useLeadsStore((s) => s.view);
  const setView = useLeadsStore((s) => s.setView);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);

  const loadLeads = useCallback(async () => {
    try {
      const response = await leadsService.getLeads(filter, 1, 100);
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to load leads:', error);
      toast.error('Impossible de charger les leads');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const formatCurrency = (value?: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const handleStatusChange = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      try {
        await leadsService.changeStatus(leadId, { status: newStatus });

        // Award XP for forward progress only (perdu doesn't award).
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

        toast.success(`Lead déplacé vers « ${LEAD_STATUS_LABELS[newStatus]} »`);
        // Refresh from server so we have authoritative state.
        loadLeads();
      } catch (error) {
        console.error('Failed to change status:', error);
        toast.error('Impossible de changer le statut');
        // Re-throw so the kanban can roll back its optimistic update.
        throw error;
      }
    },
    [gamification, loadLeads],
  );

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="leads-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
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

      {/* Filters */}
      <LeadsFilters />

      {/* Kanban */}
      {view === 'kanban' && (
        <LeadKanban leads={leads} onStatusChange={handleStatusChange} />
      )}

      {/* List */}
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
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong>
                          {lead.firstName} {lead.lastName}
                        </strong>
                        {lead.company && (
                          <div className="text-muted small">{lead.company}</div>
                        )}
                      </td>
                      <td>{lead.title}</td>
                      <td>{LEAD_SOURCE_LABELS[lead.source]}</td>
                      <td>
                        <span className={`badge badge-${lead.status}`}>
                          {LEAD_STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td>{formatCurrency(lead.estimatedValue)}</td>
                      <td>
                        {lead.probability !== undefined ? `${lead.probability}%` : '-'}
                      </td>
                      <td>
                        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            data-bs-toggle="dropdown"
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul className="dropdown-menu">
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => navigate(`/leads/${lead.id}/edit`)}
                              >
                                <i className="bi bi-pencil me-2"></i>Modifier
                              </button>
                            </li>
                            {lead.status !== 'gagne' && lead.status !== 'perdu' && (
                              <>
                                <li>
                                  <hr className="dropdown-divider" />
                                </li>
                                {PIPELINE_STAGES.filter((s) => s !== lead.status).map(
                                  (status) => (
                                    <li key={status}>
                                      <button
                                        className="dropdown-item"
                                        onClick={() =>
                                          handleStatusChange(lead.id, status)
                                        }
                                      >
                                        Passer à {LEAD_STATUS_LABELS[status]}
                                      </button>
                                    </li>
                                  ),
                                )}
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
