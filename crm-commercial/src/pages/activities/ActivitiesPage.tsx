import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody, Spinner, Button, Table } from '../../components';
import { activitiesService } from '../../services';
import type { Activity, ActivityType, ActivityStatus } from '../../types';
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_ICONS } from '../../types';
import { useGamificationStore } from '../../stores';
import { XPIndicator } from '../../components/gamification';

export function ActivitiesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gamification = useGamificationStore();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filterType, setFilterType] = useState<ActivityType | ''>('');
  const [filterStatus, setFilterStatus] = useState<ActivityStatus | ''>('');

  useEffect(() => {
    loadActivities();
  }, [filterType, filterStatus]);

  const loadActivities = async () => {
    try {
      const response = await activitiesService.getActivities({
        type: filterType || undefined,
        status: filterStatus || undefined,
        leadId: searchParams.get('leadId') || undefined,
      }, 1, 50);
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (activity: Activity) => {
    try {
      await activitiesService.completeActivity(activity.id);

      // Award XP based on activity type
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
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: ActivityStatus) => {
    const variants: Record<ActivityStatus, string> = {
      planifie: 'bg-info',
      termine: 'bg-success',
      annule: 'bg-secondary',
    };
    return variants[status];
  };

  const getXPForType = (type: ActivityType) => {
    const xp: Record<ActivityType, number> = {
      appel: 20,
      email: 15,
      reunion: 60,
      visite: 50,
      note: 10,
      tache: 10,
    };
    return xp[type] || 10;
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="activities-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex gap-2">
          <select
            className="form-select form-select-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ActivityType | '')}
            style={{ width: '150px' }}
          >
            <option value="">Tous les types</option>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            className="form-select form-select-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ActivityStatus | '')}
            style={{ width: '150px' }}
          >
            <option value="">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        <Button icon="bi-plus-lg" onClick={() => navigate('/activities/new')}>
          Nouvelle activité
        </Button>
      </div>

      {/* Activities List */}
      <Card>
        <CardBody className="p-0">
          <Table
            columns={[
              {
                key: 'type',
                header: 'Type',
                render: (activity: Activity) => (
                  <span className={`badge badge-${activity.type}`}>
                    <i className={`bi ${ACTIVITY_TYPE_ICONS[activity.type]} me-1`}></i>
                    {ACTIVITY_TYPE_LABELS[activity.type]}
                  </span>
                ),
              },
              { key: 'subject', header: 'Sujet' },
              {
                key: 'scheduledAt',
                header: 'Date planifiée',
                render: (activity: Activity) => formatDate(activity.scheduledAt),
              },
              {
                key: 'duration',
                header: 'Durée',
                render: (activity: Activity) => activity.duration ? `${activity.duration} min` : '-',
              },
              {
                key: 'status',
                header: 'Statut',
                render: (activity: Activity) => (
                  <span className={`badge ${getStatusBadge(activity.status)}`}>
                    {activity.status}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (activity: Activity) => (
                  <div className="d-flex gap-1 align-items-center">
                    {activity.status === 'planifie' && (
                      <>
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComplete(activity);
                          }}
                          title="Marquer comme terminé"
                        >
                          <i className="bi bi-check-lg"></i>
                        </button>
                        <XPIndicator xp={getXPForType(activity.type)} size="sm" />
                      </>
                    )}
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/activities/${activity.id}/edit`);
                      }}
                      title="Modifier"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  </div>
                ),
              },
            ]}
            data={activities}
            keyExtractor={(activity) => activity.id}
            emptyMessage="Aucune activité"
          />
        </CardBody>
      </Card>
    </div>
  );
}

export default ActivitiesPage;
