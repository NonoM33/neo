import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button, Input, Select, Textarea } from '../../components';
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

  useEffect(() => {
    if (isEditing && id) {
      loadActivity();
    }
  }, [id]);

  const loadActivity = async () => {
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
  };

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

  const typeOptions = Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="activity-form">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour
          </button>
          <div className="d-flex align-items-center gap-2">
            <h2 className="mb-0">{isEditing ? 'Modifier l\'activité' : 'Nouvelle activité'}</h2>
            {!isEditing && <XPIndicator xp={5} />}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <Card className="mb-4">
              <CardHeader>Détails de l'activité</CardHeader>
              <CardBody>
                <div className="row">
                  <div className="col-md-6">
                    <Select
                      label="Type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      options={typeOptions}
                      error={errors.type}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <Input
                      label="Durée (minutes)"
                      name="duration"
                      type="number"
                      value={formData.duration || ''}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <Input
                  label="Sujet"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  error={errors.subject}
                  required
                />

                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />

                <div className="row">
                  <div className="col-md-6">
                    <Input
                      label="Date et heure"
                      name="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <Input
                      label="Rappel"
                      name="reminderAt"
                      type="datetime-local"
                      value={formData.reminderAt}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="d-flex gap-2 justify-content-end">
              <Button type="button" variant="outline-secondary" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" loading={submitting} icon="bi-check-lg">
                {isEditing ? 'Enregistrer' : 'Créer l\'activité'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ActivityFormPage;
