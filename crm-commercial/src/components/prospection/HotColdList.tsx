import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lead, Activity } from '../../types';
import { computeLeadScore } from '../../services/scoring.engine';
import { ScoreGauge } from './ScoreGauge';

interface HotColdListProps {
  leads: Lead[];
  activities: Activity[];
}

export function HotColdList({ leads, activities }: HotColdListProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'hot' | 'cold'>('hot');

  const activeLeads = leads.filter(l => l.status !== 'gagne' && l.status !== 'perdu');

  const scoredLeads = activeLeads.map(lead => ({
    lead,
    score: computeLeadScore(lead, activities),
    lastActivityDate: getLastActivityDate(lead.id, activities),
  }));

  const hotLeads = scoredLeads
    .filter(s => s.score.total >= 50)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 8);

  const coldLeads = scoredLeads
    .filter(s => {
      if (!s.lastActivityDate) return true;
      return (Date.now() - s.lastActivityDate) / (1000 * 60 * 60 * 24) > 7;
    })
    .sort((a, b) => (a.lastActivityDate || 0) - (b.lastActivityDate || 0))
    .slice(0, 8);

  const currentList = tab === 'hot' ? hotLeads : coldLeads;

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <button
          className={`btn btn-sm ${tab === 'hot' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setTab('hot')}
        >
          🔥 Chauds ({hotLeads.length})
        </button>
        <button
          className={`btn btn-sm ${tab === 'cold' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setTab('cold')}
        >
          ❄️ Froids ({coldLeads.length})
        </button>
      </div>

      <div className="d-flex flex-column gap-2">
        {currentList.map(({ lead, score, lastActivityDate }) => (
          <div
            key={lead.id}
            className="d-flex align-items-center gap-3"
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--neo-bg-light)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onClick={() => navigate(`/leads/${lead.id}`)}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--neo-bg-elevated, var(--neo-bg-light))'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--neo-bg-light)'}
          >
            <ScoreGauge score={score} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                fontSize: '0.85rem',
                color: 'var(--neo-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {lead.firstName} {lead.lastName}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--neo-text-muted)',
              }}>
                {lead.title}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--neo-text-muted)' }}>
                {lastActivityDate
                  ? `il y a ${Math.floor((Date.now() - lastActivityDate) / (1000 * 60 * 60 * 24))}j`
                  : 'Aucune activité'
                }
              </div>
            </div>
          </div>
        ))}
        {currentList.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: 'var(--neo-text-muted)',
            fontSize: '0.85rem',
          }}>
            {tab === 'hot' ? 'Aucun lead chaud' : 'Aucun lead froid'}
          </div>
        )}
      </div>
    </div>
  );
}

function getLastActivityDate(leadId: string, activities: Activity[]): number | null {
  const leadActivities = activities.filter(a => a.leadId === leadId);
  if (leadActivities.length === 0) return null;
  return Math.max(
    ...leadActivities.map(a => new Date(a.completedAt || a.updatedAt || a.createdAt).getTime())
  );
}

export default HotColdList;
