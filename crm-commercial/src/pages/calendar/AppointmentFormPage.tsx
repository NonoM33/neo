import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '../../components';
import { Btn, Card, Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { appointmentsService } from '../../services/appointments.service';
import type {
  AppointmentType,
  LocationType,
  CreateAppointmentInput,
} from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
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

const TYPE_ICON: Record<AppointmentType, IconName> = {
  visite_technique: 'building',
  audit: 'crosshair',
  rdv_commercial: 'message',
  installation: 'package',
  sav: 'headset',
  reunion_interne: 'users',
  autre: 'calendar',
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

  const loadAppointment = useCallback(async () => {
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
  }, [id]);

  const checkConflicts = useCallback(async () => {
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
  }, [formData.scheduledAt, formData.endAt, isEditing, id]);

  useEffect(() => {
    if (isEditing && id) {
      loadAppointment();
    }
  }, [isEditing, id, loadAppointment]);

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
  }, [formData.scheduledAt, formData.endAt, formData.participantUserIds, checkConflicts]);

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
      participantUserIds: prev.participantUserIds.filter((pid) => pid !== userId),
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

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="appointment-form" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button
            type="button"
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
          <h1>{isEditing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Card head="Type de rendez-vous" icon="calendar">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 10,
            }}
          >
            {(Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]).map((type) => {
              const active = formData.type === type;
              const color = APPOINTMENT_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 7,
                    padding: '14px 8px',
                    borderRadius: 10,
                    border: `1.5px solid ${active ? color : 'var(--line-2)'}`,
                    background: active ? color : 'var(--card)',
                    color: active ? '#fff' : 'var(--ink-2)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                    fontSize: 12.5,
                    fontWeight: 500,
                  }}
                >
                  <Icon name={TYPE_ICON[type]} size={20} />
                  <span>{APPOINTMENT_TYPE_LABELS[type]}</span>
                </button>
              );
            })}
          </div>
          {errors.type && <div className="field-error">{errors.type}</div>}
        </Card>

        <Card head="Détails" icon="fileText">
          <div>
            <div className="field-label">Titre</div>
            <input
              className="neo-field"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={APPOINTMENT_TYPE_LABELS[formData.type]}
            />
          </div>

          <div
            className="field-grid"
            style={{ marginTop: 14, paddingTop: 0, borderTop: 'none', gridTemplateColumns: '2fr 1fr 1fr' }}
          >
            <div>
              <div className="field-label">Date et heure de début</div>
              <input
                className="neo-field"
                name="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={handleChange}
                required
              />
              {errors.scheduledAt && <div className="field-error">{errors.scheduledAt}</div>}
            </div>
            <div>
              <div className="field-label">Durée (min)</div>
              <input
                className="neo-field"
                name="duration"
                type="number"
                value={formData.duration}
                onChange={handleChange}
                required
              />
              {errors.duration && <div className="field-error">{errors.duration}</div>}
            </div>
            <div>
              <div className="field-label">Fin (calculée)</div>
              <input
                className="neo-field"
                type="datetime-local"
                value={formData.endAt}
                readOnly
                style={{ background: 'var(--paper-2)', color: 'var(--ink-3)' }}
              />
            </div>
          </div>

          {conflictWarning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 14,
                padding: '10px 13px',
                borderRadius: 8,
                background: 'var(--ochre-soft)',
                border: '1px solid #f0dcae',
                color: 'var(--ochre-ink)',
                fontSize: 13,
              }}
            >
              <Icon name="bell" size={15} />
              {conflictWarning}
            </div>
          )}
        </Card>

        <Card head="Lieu" icon="building">
          <div
            className="field-grid"
            style={{ marginTop: 0, paddingTop: 0, borderTop: 'none', gridTemplateColumns: '1fr 2fr' }}
          >
            <div>
              <div className="field-label">Type de lieu</div>
              <select className="neo-field" name="locationType" value={formData.locationType} onChange={handleChange}>
                {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="field-label">Adresse / Lien</div>
              <input
                className="neo-field"
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
        </Card>

        <Card head="Liens" icon="folder">
          <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <div>
              <div className="field-label">ID Lead</div>
              <input
                className="neo-field"
                name="leadId"
                value={formData.leadId}
                onChange={handleChange}
                placeholder="optionnel"
              />
            </div>
            <div>
              <div className="field-label">ID Client</div>
              <input
                className="neo-field"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                placeholder="optionnel"
              />
            </div>
            <div>
              <div className="field-label">ID Projet</div>
              <input
                className="neo-field"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                placeholder="optionnel"
              />
            </div>
          </div>
        </Card>

        <Card head="Participants" icon="users">
          {formData.participantUserIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {formData.participantUserIds.map((userId) => (
                <span
                  key={userId}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 99,
                    background: 'var(--paper-2)',
                    border: '1px solid var(--line)',
                    fontSize: 13,
                  }}
                >
                  <Icon name="user" size={13} />
                  {userId}
                  <button
                    type="button"
                    onClick={() => removeParticipant(userId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--ink-4)', padding: 0 }}
                    aria-label="Retirer"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="neo-field"
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
            <Btn type="button" variant="subtle" icon="plus" onClick={addParticipant} disabled={!newParticipantId.trim()}>
              Ajouter
            </Btn>
          </div>
        </Card>

        <Card head="Notes" icon="fileText">
          <textarea
            className="neo-field"
            name="notes"
            rows={4}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notes internes sur ce rendez-vous..."
            style={{ resize: 'vertical' }}
          />
        </Card>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn type="button" variant="subtle" onClick={() => navigate(-1)}>
            Annuler
          </Btn>
          <Btn type="submit" icon="check" disabled={submitting}>
            {isEditing ? 'Enregistrer' : 'Créer le rendez-vous'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

export default AppointmentFormPage;
