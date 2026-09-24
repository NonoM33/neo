import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../../components';
import { Btn, Card, Icon } from '../../components/neo';
import { activitiesService, type CreateActivityInput } from '../../services/activities.service';
import { ACTIVITY_TYPE_LABELS } from '../../types';
import { useGamificationStore } from '../../stores';
import { XPIndicator } from '../../components/gamification';

export function ActivityFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gamification = useGamificationStore();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CreateActivityInput>({
    leadId: searchParams.get('leadId') || undefined,
    type: 'appel',
    subject: '',
    description: '',
    scheduledAt: '',
    duration: 30,
    reminderAt: '',
  });

  const loadActivity = useCallback(async () => {
    try {
      const activity = await activitiesService.getActivity(id!);
      setFormData({
        leadId: activity.leadId,
        clientId: activity.clientId,
        projectId: activity.projectId,
        type: activity.type,
        subject: activity.subject,
        description: activity.description || '',
        scheduledAt: activity.scheduledAt || '',
        duration: activity.duration,
        reminderAt: activity.reminderAt || '',
      });
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing && id) {
      loadActivity();
    }
  }, [isEditing, id, loadActivity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : undefined) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) newErrors.subject = 'Le sujet est requis';
    if (!formData.type) newErrors.type = 'Le type est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEditing) {
        await activitiesService.updateActivity(id!, formData);
      } else {
        await activitiesService.createActivity(formData);
        gamification.awardXP('activity_created');
      }
      navigate('/activities');
    } catch (error) {
      console.error('Failed to save activity:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="activity-form" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <Icon name="arrowLeft" size={15} />
            Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>{isEditing ? "Modifier l'activité" : 'Nouvelle activité'}</h1>
            {!isEditing && <XPIndicator xp={5} />}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card head="Détails de l'activité" icon="calendar">
          <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <div>
              <div className="field-label">Type</div>
              <select className="neo-field" name="type" value={formData.type} onChange={handleChange} required>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.type && <div className="field-error">{errors.type}</div>}
            </div>
            <div>
              <div className="field-label">Durée (minutes)</div>
              <input
                className="neo-field"
                name="duration"
                type="number"
                value={formData.duration || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="field-label">Sujet</div>
            <input className="neo-field" name="subject" value={formData.subject} onChange={handleChange} required />
            {errors.subject && <div className="field-error">{errors.subject}</div>}
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="field-label">Description</div>
            <textarea
              className="neo-field"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="field-grid" style={{ marginTop: 14, paddingTop: 0, borderTop: 'none' }}>
            <div>
              <div className="field-label">Date et heure</div>
              <input
                className="neo-field"
                name="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={handleChange}
              />
            </div>
            <div>
              <div className="field-label">Rappel</div>
              <input
                className="neo-field"
                name="reminderAt"
                type="datetime-local"
                value={formData.reminderAt}
                onChange={handleChange}
              />
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <Btn type="button" variant="subtle" onClick={() => navigate(-1)}>
            Annuler
          </Btn>
          <Btn type="submit" icon="check" disabled={submitting}>
            {isEditing ? 'Enregistrer' : "Créer l'activité"}
          </Btn>
        </div>
      </form>
    </div>
  );
}

export default ActivityFormPage;
