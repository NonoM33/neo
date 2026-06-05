import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { IconName, PillTone } from '../../components/neo';
import { activitiesService } from '../../services';
import type { Activity, ActivityType, ActivityStatus } from '../../types';
import { ACTIVITY_TYPE_LABELS } from '../../types';
import { useGamificationStore } from '../../stores';
import { XPIndicator } from '../../components/gamification';

const TYPE_ICON: Record<ActivityType, IconName> = {
  appel: 'phone',
  email: 'mail',
  reunion: 'users',
  visite: 'building',
  note: 'fileText',
  tache: 'check',
};

const STATUS_TONE: Record<ActivityStatus, PillTone> = {
  planifie: 'info',
  termine: 'success',
  annule: 'neutral',
};

const STATUS_LABEL: Record<ActivityStatus, string> = {
  planifie: 'Planifié',
  termine: 'Terminé',
  annule: 'Annulé',
};

const TYPE_XP: Record<ActivityType, number> = {
  appel: 20,
  email: 15,
  reunion: 60,
  visite: 50,
  note: 10,
  tache: 10,
};

export function ActivitiesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filterType, setFilterType] = useState<ActivityType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | ''>('');

  const loadActivities = useCallback(async () => {
    try {
      const response = await activitiesService.getActivities(
        {
          type: filterType || undefined,
          status: filterStatus || undefined,
          leadId: searchParams.get('leadId') || undefined,
        },
        1,
        50
      );
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, searchParams]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleComplete = async (activity: Activity) => {
    try {
      await activitiesService.completeActivity(activity.id);

      gamification.awardXP('activity_completed');
      switch (activity.type) {
        case 'appel':
          gamification.awardXP('call_logged');
          break;
        case 'email':
          gamification.awardXP('email_logged');
          break;
        case 'reunion':
          gamification.awardXP('meeting_booked');
          break;
        case 'visite':
          gamification.awardXP('visit_done');
          break;
      }

      loadActivities();
    } catch (error) {
      console.error('Failed to complete activity:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="activities-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Activités</h1>
          <p>Appels, emails, réunions et tâches</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/activities/new')}>
            Nouvelle activité
          </Btn>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <select
            className="neo-field"
            style={{ maxWidth: 200 }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActivityType | '')}
          >
            <option value="">Tous les types</option>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="neo-field"
            style={{ maxWidth: 200 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ActivityStatus | '')}
          >
            <option value="">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Type</th>
              <th>Sujet</th>
              <th>Date planifiée</th>
              <th>Durée</th>
              <th>Statut</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr
                key={activity.id}
                onClick={() => navigate(`/activities/${activity.id}/edit`)}
                style={{ cursor: 'pointer' }}
              >
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    <Icon name={TYPE_ICON[activity.type]} size={15} />
                    {ACTIVITY_TYPE_LABELS[activity.type]}
                  </span>
                </td>
                <td className="t-main">{activity.subject}</td>
                <td className="t-sub">{formatDate(activity.scheduledAt)}</td>
                <td className="t-sub">{activity.duration ? `${activity.duration} min` : '—'}</td>
                <td>
                  <Pill tone={STATUS_TONE[activity.status]} dot>
                    {STATUS_LABEL[activity.status]}
                  </Pill>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {activity.status === 'planifie' && (
                      <>
                        <button
                          className="icon-btn"
                          aria-label="Marquer comme terminé"
                          onClick={() => handleComplete(activity)}
                        >
                          <Icon name="check" size={16} />
                        </button>
                        <XPIndicator xp={TYPE_XP[activity.type]} size="sm" />
                      </>
                    )}
                    <button
                      className="icon-btn"
                      aria-label="Modifier"
                      onClick={() => navigate(`/activities/${activity.id}/edit`)}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {activities.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <span className="em-ic">
                      <Icon name="calendar" size={22} />
                    </span>
                    <b>Aucune activité</b>
                    <p>Ajustez vos filtres ou planifiez une activité.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ActivitiesPage;
