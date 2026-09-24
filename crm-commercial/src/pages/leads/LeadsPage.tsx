import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { LeadsFilters, LeadKanban } from '../../components/leads';
import { Btn, Pill, Icon } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { leadsService } from '../../services';
import type { Lead, LeadStatus } from '../../types';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, PIPELINE_STAGES } from '../../types';
import { useGamificationStore, useLeadsStore } from '../../stores';

const LEAD_TONE: Record<LeadStatus, PillTone> = {
  prospect: 'neutral',
  qualifie: 'info',
  proposition: 'ochre',
  negociation: 'warning',
  gagne: 'success',
  perdu: 'danger',
};

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
      <div className="page-head">
        <div className="ph-l">
          <h1>Pipeline</h1>
          <p>
            {leads.length} lead{leads.length > 1 ? 's' : ''} — suivez vos opportunités commerciales
          </p>
        </div>
        <div className="page-actions">
          <div className="seg">
            <button className={view === 'kanban' ? 'on' : ''} onClick={() => setView('kanban')}>
              Kanban
            </button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
              Liste
            </button>
          </div>
          <Btn icon="plus" onClick={() => navigate('/leads/new')}>
            Nouveau lead
          </Btn>
        </div>
      </div>

      <LeadsFilters />

      {view === 'kanban' && (
        <LeadKanban leads={leads} onStatusChange={handleStatusChange} />
      )}

      {view === 'list' && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Projet</th>
                <th>Source</th>
                <th>Statut</th>
                <th>Valeur</th>
                <th>Probabilité</th>
                <th />
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
                    <div className="t-main">
                      {lead.firstName} {lead.lastName}
                    </div>
                    {lead.company && <div className="t-sub">{lead.company}</div>}
                  </td>
                  <td>{lead.title}</td>
                  <td className="t-sub">{LEAD_SOURCE_LABELS[lead.source]}</td>
                  <td>
                    <Pill tone={LEAD_TONE[lead.status]} dot>
                      {LEAD_STATUS_LABELS[lead.status]}
                    </Pill>
                  </td>
                  <td className="t-mono">{formatCurrency(lead.estimatedValue)}</td>
                  <td className="t-mono">
                    {lead.probability !== undefined ? `${lead.probability}%` : '-'}
                  </td>
                  <td>
                    <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" data-bs-toggle="dropdown" aria-label="Actions">
                        <Icon name="more" size={17} />
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
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="inbox" size={22} />
                      </span>
                      <b>Aucun lead</b>
                      <p>Ajustez vos filtres ou créez un nouveau lead.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LeadsPage;
