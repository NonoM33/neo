import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Btn, Card, Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { ticketsService } from '../../services';
import type { TicketPriority, TicketStats, TicketStatus } from '../../types';
import { ticketPriorityLabels, ticketStatusLabels } from '../../types';

const STATUS_COLOR: Record<TicketStatus, string> = {
  nouveau: 'var(--komun)',
  ouvert: 'var(--ochre)',
  en_attente_client: 'var(--warning)',
  en_attente_interne: 'var(--warning)',
  escalade: 'var(--danger)',
  resolu: 'var(--success)',
  ferme: 'var(--ink-3)',
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  basse: 'var(--ink-3)',
  normale: 'var(--komun)',
  haute: 'var(--ochre)',
  urgente: 'var(--warning)',
  critique: 'var(--danger)',
};

export function SupportDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await ticketsService.getStats();
        if (!cancelled) setStats(data);
      } catch (error) {
        console.error('Failed to load support stats:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Spinner />;
  }

  const totalByStatus = stats?.byStatus.reduce((acc, s) => acc + s.total, 0) ?? 0;
  const maxStatus = Math.max(1, ...(stats?.byStatus.map((s) => s.total) ?? [0]));
  const maxPriority = Math.max(1, ...(stats?.byPriority.map((p) => p.total) ?? [0]));

  const cards: { icon: IconName; tone: string; val: string; label: string }[] = [
    { icon: 'ticket', tone: 'blue', val: String(stats?.totalOpen ?? 0), label: 'Tickets ouverts' },
    { icon: 'flame', tone: 'danger', val: String(stats?.slaBreached ?? 0), label: 'SLA dépassés' },
    {
      icon: 'clock',
      tone: 'ochre',
      val: stats?.avgResolutionHours != null ? `${stats.avgResolutionHours} h` : '-',
      label: 'Résolution moyenne',
    },
    { icon: 'inbox', tone: 'ink', val: String(totalByStatus), label: 'Tickets au total' },
  ];

  return (
    <div className="support-dashboard">
      <div className="page-head">
        <div className="ph-l">
          <h1>Tableau de bord support</h1>
          <p>Vue d'ensemble de l'activité des tickets</p>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="ticket" onClick={() => navigate('/tickets')}>
            Voir les tickets
          </Btn>
          <Btn icon="plus" onClick={() => navigate('/tickets/new')}>
            Nouveau ticket
          </Btn>
        </div>
      </div>

      <div className="stat-grid mb-22" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {cards.map((s) => (
          <div className="stat" key={s.label}>
            <div className="st-top">
              <span className={'st-ic ' + s.tone}>
                <Icon name={s.icon} size={19} />
              </span>
            </div>
            <div className="st-val">{s.val}</div>
            <div className="st-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-22">
        <Card head="Tickets par statut" icon="filter">
          <div className="funnel">
            {stats?.byStatus.map((row) => {
              const status = row.status as TicketStatus;
              const pct = (row.total / maxStatus) * 100;
              return (
                <div className="funnel-row" key={row.status}>
                  <span className="fl">{ticketStatusLabels[status] ?? row.status}</span>
                  <div
                    className="funnel-bar"
                    style={{
                      width: `${Math.max(pct, 8)}%`,
                      background: STATUS_COLOR[status] ?? 'var(--komun)',
                    }}
                  >
                    {row.total}
                  </div>
                </div>
              );
            })}
            {!stats?.byStatus.length && <div className="empty">Aucun ticket</div>}
          </div>
        </Card>

        <Card head="Tickets ouverts par priorité" icon="flame">
          <div className="funnel">
            {stats?.byPriority.map((row) => {
              const priority = row.priority as TicketPriority;
              const pct = (row.total / maxPriority) * 100;
              return (
                <div className="funnel-row" key={row.priority}>
                  <span className="fl">{ticketPriorityLabels[priority] ?? row.priority}</span>
                  <div
                    className="funnel-bar"
                    style={{
                      width: `${Math.max(pct, 8)}%`,
                      background: PRIORITY_COLOR[priority] ?? 'var(--komun)',
                    }}
                  >
                    {row.total}
                  </div>
                </div>
              );
            })}
            {!stats?.byPriority.length && <div className="empty">Aucun ticket ouvert</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SupportDashboardPage;
