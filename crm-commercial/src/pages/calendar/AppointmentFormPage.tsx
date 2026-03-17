import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button, Input, Select, Textarea } from '../../components';
import { appointmentsService } from '../../services/appointments.service';
import type {
  AppointmentType,
  LocationType,
  CreateAppointmentInput,
} from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_TYPE_ICONS,
  LOCATION_TYPE_LABELS,
} from '../../types/appointment.types';

const DEFAULT_DURATIONS: Record<AppointmentType, number> = {
  visite_technique: 90,
  audit: 120,
  rdv_commercial: 60,
  installation: 240,
  sav: 60,
  reunion_interne: 60,
  autre: 30,
};

interface FormData {
  title: string;
  type: AppointmentType;
  scheduledAt: string;
  endAt: string;
  duration: number;
  location: string;
  locationType: LocationType;
  leadId: string;
  clientId: string;
  projectId: string;
  notes: string;
  participantUserIds: string[];
}

export function AppointmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [newParticipantId, setNewParticipantId] = useState('');

  // Pre-fill date from query param
  const prefillDate = searchParams.get('date') || '';
  const getInitialScheduledAt = () => {
    if (prefillDate) {
      // If we got a full ISO string, convert to datetime-local format
      const d = new Date(prefillDate);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }
    return '';
  };

  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'rdv_commercial',
    scheduledAt: getInitialScheduledAt(),
    endAt: '',
    duration: DEFAULT_DURATIONS['rdv_commercial'],
    location: '',
    locationType: 'sur_site',
    leadId: '',
    clientId: '',
    projectId: '',
    notes: '',
    participantUserIds: [],
  });

  useEffect(() => {
    if (isEditing && id) {
      loadAppointment();
    }
  }, [id]);

  // Auto-compute endAt from scheduledAt + duration
  useEffect(() => {
    if (formData.scheduledAt && formData.duration > 0) {
      const start = new Date(formData.scheduledAt);
      if (!isNaN(start.getTime())) {
        const end = new Date(start.getTime() + formData.duration * 60 * 1000);
        const year = end.getFullYear();
        const month = String(end.getMonth() + 1).padStart(2, '0');
        const day = String(end.getDate()).padStart(2, '0');
        const hours = String(end.getHours()).padStart(2, '0');
        const minutes = String(end.getMinutes()).padStart(2, '0');
        setFormData((prev) => ({ ...prev, endAt: `${year}-${month}-${day}T${hours}:${minutes}` }));
      }
    }
  }, [formData.scheduledAt, formData.duration]);

  // Check for conflicts when date/time changes
  useEffect(() => {
    if (formData.scheduledAt && formData.endAt) {
      checkConflicts();
    }
  }, [formData.scheduledAt, formData.endAt, formData.participantUserIds]);

  const loadAppointment = async () => {
    try {
      const appointment = await appointmentsService.getAppointment(id!);
      const formatDTLocal = (iso: string) => {
        const d = new Date(iso);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };
      setFormData({
        title: appointment.title,
        type: appointment.type,
        scheduledAt: formatDTLocal(appointment.scheduledAt),
        endAt: formatDTLocal(appointment.endAt),
        duration: appointment.duration,
        location: appointment.location || '',
        locationType: appointment.locationType,
        leadId: appointment.leadId || '',
        clientId: appointment.clientId || '',
        projectId: appointment.projectId || '',
        notes: appointment.notes || '',
        participantUserIds: appointment.participants?.map((p) => p.userId) || [],
      });
    } catch (error) {
      console.error('Erreur lors du chargement du rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConflicts = async () => {
    try {
      const start = new Date(formData.scheduledAt);
      const end = new Date(formData.endAt);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      const fromDate = formData.scheduledAt.split('T')[0];
      const toDate = formData.endAt.split('T')[0];
      const existing = await appointmentsService.getAppointments({
        fromDate,
        toDate,
      });

      const conflicts = existing.filter((a) => {
        if (isEditing && a.id === id) return false;
        if (a.status === 'annule' || a.status === 'no_show') return false;
        const aStart = new Date(a.scheduledAt);
        const aEnd = new Date(a.endAt);
        return aStart < end && aEnd > start;
      });

      if (conflicts.length > 0) {
        setConflictWarning(
          `Attention : ${conflicts.length} rendez-vous existant${conflicts.length > 1 ? 's' : ''} sur ce créneau (${conflicts.map((c) => c.title).join(', ')})`
        );
      } else {
        setConflictWarning(null);
      }
    } catch {
      // Silently ignore conflict check errors
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : 0) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleTypeChange = (type: AppointmentType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      duration: DEFAULT_DURATIONS[type],
      title: prev.title || APPOINTMENT_TYPE_LABELS[type],
    }));
  };

  const addParticipant = () => {
    if (newParticipantId.trim() && !formData.participantUserIds.includes(newParticipantId.trim())) {
      setFormData((prev) => ({
        ...prev,
        participantUserIds: [...prev.participantUserIds, newParticipantId.trim()],
      }));
      setNewParticipantId('');
    }
  };

  const removeParticipant = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      participantUserIds: prev.participantUserIds.filter((id) => id !== userId),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) newErrors.type = 'Le type est requis';
    if (!formData.scheduledAt) newErrors.scheduledAt = 'La date de début est requise';
    if (!formData.duration || formData.duration <= 0) newErrors.duration = 'La durée doit être supérieure à 0';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const input: CreateAppointmentInput = {
        title: formData.title || APPOINTMENT_TYPE_LABELS[formData.type],
        type: formData.type,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        endAt: new Date(formData.endAt).toISOString(),
        duration: formData.duration,
        location: formData.location || undefined,
        locationType: formData.locationType,
        leadId: formData.leadId || undefined,
        clientId: formData.clientId || undefined,
        projectId: formData.projectId || undefined,
        notes: formData.notes || undefined,
        participants: formData.participantUserIds.map((userId) => ({ userId, role: 'participant' as const })),
      };

      if (isEditing) {
        await appointmentsService.updateAppointment(id!, input);
      } else {
        await appointmentsService.createAppointment(input);
      }
      navigate('/calendar');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const locationTypeOptions = Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="appointment-form">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour
          </button>
          <h2 className="mb-0" style={{ fontWeight: 600 }}>
            {isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Type Selection */}
            <Card className="mb-4">
              <CardHeader>Type de rendez-vous</CardHeader>
              <CardBody>
                <div className="row g-2">
                  {(Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]).map((type) => (
                    <div key={type} className="col-6 col-md-4 col-lg-3">
                      <button
                        type="button"
                        className={`btn w-100 d-flex flex-column align-items-center gap-1 py-3 ${
                          formData.type === type ? 'btn-primary' : 'btn-outline-secondary'
                        }`}
                        style={{
                          borderColor: formData.type === type ? APPOINTMENT_TYPE_COLORS[type] : undefined,
                          backgroundColor: formData.type === type ? APPOINTMENT_TYPE_COLORS[type] : undefined,
                          color: formData.type === type ? '#fff' : undefined,
                          transition: 'all 0.2s',
                        }}
                        onClick={() => handleTypeChange(type)}
                      >
                        <i className={`bi ${APPOINTMENT_TYPE_ICONS[type]}`} style={{ fontSize: '1.3rem' }}></i>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                          {APPOINTMENT_TYPE_LABELS[type]}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
                {errors.type && <div className="text-danger mt-2" style={{ fontSize: '0.875rem' }}>{errors.type}</div>}
              </CardBody>
            </Card>

            {/* Details */}
            <Card className="mb-4">
              <CardHeader>Détails</CardHeader>
              <CardBody>
                <Input
                  label="Titre"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={APPOINTMENT_TYPE_LABELS[formData.type]}
                />

                <div className="row">
                  <div className="col-md-6">
                    <Input
                      label="Date et heure de début"
                      name="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={handleChange}
                      error={errors.scheduledAt}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <Input
                      label="Durée (min)"
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleChange}
                      error={errors.duration}
                      required
                    />
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label">Fin (calculée)</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.endAt}
                        readOnly
                        style={{ backgroundColor: 'var(--neo-bg-light)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Conflict Warning */}
                {conflictWarning && (
                  <div className="alert alert-warning d-flex align-items-center gap-2 py-2" style={{ fontSize: '0.875rem' }}>
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    {conflictWarning}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Location */}
            <Card className="mb-4">
              <CardHeader>Lieu</CardHeader>
              <CardBody>
                <div className="row">
                  <div className="col-md-4">
                    <Select
                      label="Type de lieu"
                      name="locationType"
                      value={formData.locationType}
                      onChange={handleChange}
                      options={locationTypeOptions}
                    />
                  </div>
                  <div className="col-md-8">
                    <Input
                      label="Adresse / Lien"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder={
                        formData.locationType === 'visio'
                          ? 'Lien de visioconférence'
                          : formData.locationType === 'telephone'
                          ? 'Numéro de téléphone'
                          : 'Adresse'
                      }
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Linked Entities */}
            <Card className="mb-4">
              <CardHeader>Liens</CardHeader>
              <CardBody>
                <div className="row">
                  <div className="col-md-4">
                    <Input
                      label="ID Lead"
                      name="leadId"
                      value={formData.leadId}
                      onChange={handleChange}
                      placeholder="ID du lead (optionnel)"
                    />
                  </div>
                  <div className="col-md-4">
                    <Input
                      label="ID Client"
                      name="clientId"
                      value={formData.clientId}
                      onChange={handleChange}
                      placeholder="ID du client (optionnel)"
                    />
                  </div>
                  <div className="col-md-4">
                    <Input
                      label="ID Projet"
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleChange}
                      placeholder="ID du projet (optionnel)"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Participants */}
            <Card className="mb-4">
              <CardHeader>Participants</CardHeader>
              <CardBody>
                {formData.participantUserIds.length > 0 && (
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {formData.participantUserIds.map((userId) => (
                      <span
                        key={userId}
                        className="badge bg-light text-dark d-flex align-items-center gap-1"
                        style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                      >
                        <i className="bi bi-person"></i>
                        {userId}
                        <button
                          type="button"
                          className="btn-close ms-1"
                          style={{ fontSize: '0.6rem' }}
                          onClick={() => removeParticipant(userId)}
                        ></button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="ID utilisateur à ajouter"
                    value={newParticipantId}
                    onChange={(e) => setNewParticipantId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addParticipant();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={addParticipant}
                    disabled={!newParticipantId.trim()}
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
              </CardBody>
            </Card>

            {/* Notes */}
            <Card className="mb-4">
              <CardHeader>Notes</CardHeader>
              <CardBody>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notes internes sur ce rendez-vous..."
                />
              </CardBody>
            </Card>

            {/* Actions */}
            <div className="d-flex gap-2 justify-content-end">
              <Button type="button" variant="outline-secondary" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button type="submit" loading={submitting} icon="bi-check-lg">
                {isEditing ? 'Enregistrer' : 'Créer le rendez-vous'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AppointmentFormPage;
