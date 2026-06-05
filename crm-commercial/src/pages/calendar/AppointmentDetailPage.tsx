import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Avatar, Btn, Card, Icon, Pill } from '../../components/neo';
import type { BtnVariant, IconName, PillTone } from '../../components/neo';
import { appointmentsService } from '../../services/appointments.service';
import type { Appointment, AppointmentStatus, AppointmentType, LocationType } from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  LOCATION_TYPE_LABELS,
} from '../../types/appointment.types';

const TYPE_ICON: Record<AppointmentType, IconName> = {
  visite_technique: 'building',
  audit: 'crosshair',
  rdv_commercial: 'message',
  installation: 'package',
  sav: 'headset',
  reunion_interne: 'users',
  autre: 'calendar',
};

const LOCATION_ICON: Record<LocationType, IconName> = {
  visio: 'message',
  telephone: 'phone',
  bureau: 'building',
  sur_site: 'building',
};

interface ActionDef {
  key: string;
  label: string;
  icon: IconName;
  variant: BtnVariant;
}

function getAvailableActions(status: AppointmentStatus): ActionDef[] {
  switch (status) {
    case 'propose':
      return [
        { key: 'confirm', label: 'Confirmer', icon: 'checkCircle', variant: 'primary' },
        { key: 'cancel', label: 'Annuler', icon: 'x', variant: 'danger' },
      ];
    case 'confirme':
      return [
        { key: 'start', label: 'Démarrer', icon: 'rocket', variant: 'success' },
        { key: 'cancel', label: 'Annuler', icon: 'x', variant: 'danger' },
        { key: 'no_show', label: 'No-show', icon: 'eyeOff', variant: 'ochre' },
      ];
    case 'en_cours':
      return [
        { key: 'complete', label: 'Terminer', icon: 'checkCircle', variant: 'success' },
        { key: 'cancel', label: 'Annuler', icon: 'x', variant: 'danger' },
      ];
    default:
      return [];
  }
}

const PARTICIPANT_TONE: Record<string, PillTone> = {
  accepte: 'success',
  refuse: 'danger',
};

function participantTone(status: string): PillTone {
  return PARTICIPANT_TONE[status] ?? 'neutral';
}

function participantStatusLabel(status: string): string {
  switch (status) {
    case 'accepte':
      return 'Accepté';
    case 'refuse':
      return 'Refusé';
    default:
      return 'En attente';
  }
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeOutcome, setCompleteOutcome] = useState('');
  const [completeDuration, setCompleteDuration] = useState<number | undefined>(undefined);

  const loadAppointment = useCallback(async () => {
    try {
      const data = await appointmentsService.getAppointment(id!);
      setAppointment(data);
    } catch (error) {
      console.error('Erreur lors du chargement du rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadAppointment();
  }, [id, loadAppointment]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  };

  const handleAction = async (action: string) => {
    if (!appointment) return;
    setActionLoading(action);
    try {
      switch (action) {
        case 'confirm':
          await appointmentsService.confirmAppointment(appointment.id);
          break;
        case 'start':
          await appointmentsService.startAppointment(appointment.id);
          break;
        case 'complete':
          await appointmentsService.completeAppointment(appointment.id, {
            outcome: completeOutcome || undefined,
            actualDuration: completeDuration,
          });
          setShowCompleteModal(false);
          break;
        case 'cancel':
          await appointmentsService.cancelAppointment(appointment.id, cancelReason);
          setShowCancelModal(false);
          break;
        case 'no_show':
          await appointmentsService.markNoShow(appointment.id);
          break;
        case 'delete':
          await appointmentsService.deleteAppointment(appointment.id);
          navigate('/calendar');
          return;
      }
      await loadAppointment();
    } catch (error) {
      console.error(`Erreur lors de l'action ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (!appointment) {
    return (
      <div className="empty" style={{ marginTop: 60 }}>
        <span className="em-ic">
          <Icon name="calendar" size={22} />
        </span>
        <b>Rendez-vous non trouvé</b>
        <Btn onClick={() => navigate('/calendar')} style={{ marginTop: 12 }}>
          Retour à l'agenda
        </Btn>
      </div>
    );
  }

  const actions = getAvailableActions(appointment.status);
  const typeColor = APPOINTMENT_TYPE_COLORS[appointment.type];
  const statusColor = APPOINTMENT_STATUS_COLORS[appointment.status];
  const canEdit = appointment.status === 'propose' || appointment.status === 'confirme';

  const badge = (bg: string, label: string) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color: '#fff',
      }}
    >
      {label}
    </span>
  );

  return (
    <div className="appointment-detail">
      <div className="page-head">
        <div className="ph-l">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 10,
              fontSize: 13,
            }}
          >
            <Icon name="arrowLeft" size={15} />
            Retour à l'agenda
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: typeColor,
                color: '#fff',
                flex: 'none',
              }}
            >
              <Icon name={TYPE_ICON[appointment.type]} size={22} />
            </div>
            <div>
              <h1 style={{ marginBottom: 6 }}>{appointment.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {badge(typeColor, APPOINTMENT_TYPE_LABELS[appointment.type])}
                {badge(statusColor, APPOINTMENT_STATUS_LABELS[appointment.status])}
              </div>
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="page-actions">
            <Btn variant="ghost" icon="edit" onClick={() => navigate(`/calendar/${appointment.id}/edit`)}>
              Modifier
            </Btn>
          </div>
        )}
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Date et horaire" icon="clock">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 16,
              }}
            >
              <div>
                <div className="field-label">Date</div>
                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{formatDate(appointment.scheduledAt)}</div>
              </div>
              <div>
                <div className="field-label">Horaire</div>
                <div style={{ fontWeight: 500 }}>
                  {formatTime(appointment.scheduledAt)} – {formatTime(appointment.endAt)}
                </div>
              </div>
              <div>
                <div className="field-label">Durée</div>
                <div style={{ fontWeight: 500 }}>{formatDuration(appointment.duration)}</div>
              </div>
              <div>
                <div className="field-label">Lieu</div>
                <div style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={LOCATION_ICON[appointment.locationType]} size={14} />
                  {LOCATION_TYPE_LABELS[appointment.locationType]}
                </div>
                {appointment.location && (
                  <div className="t-sub" style={{ marginTop: 4, fontSize: 12.5 }}>{appointment.location}</div>
                )}
                {appointment.location && (appointment.locationType === 'sur_site' || appointment.locationType === 'bureau') && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appointment.location)}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                    style={{ marginTop: 4 }}
                  >
                    <Icon name="target" size={14} />
                    Itinéraire
                  </a>
                )}
              </div>
            </div>
          </Card>

          {actions.length > 0 && (
            <Card flush>
              <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {actions.map((action) => (
                  <Btn
                    key={action.key}
                    variant={action.variant}
                    icon={action.icon}
                    disabled={actionLoading === action.key}
                    onClick={() => {
                      if (action.key === 'cancel') {
                        setShowCancelModal(true);
                      } else if (action.key === 'complete') {
                        setCompleteDuration(appointment.duration);
                        setShowCompleteModal(true);
                      } else {
                        handleAction(action.key);
                      }
                    }}
                  >
                    {action.label}
                  </Btn>
                ))}
              </div>
            </Card>
          )}

          <Card head="Participants" icon="users">
            {appointment.organizer && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 14,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <Avatar name={`${appointment.organizer.firstName} ${appointment.organizer.lastName}`} size={40} tone="blue" />
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {appointment.organizer.firstName} {appointment.organizer.lastName}
                  </div>
                  <small className="t-sub">Organisateur</small>
                </div>
              </div>
            )}

            {appointment.participants && appointment.participants.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {appointment.participants.map((participant) => (
                  <div key={participant.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar
                        name={participant.user ? `${participant.user.firstName} ${participant.user.lastName}` : participant.userId}
                        size={36}
                        tone="ink"
                      />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>
                          {participant.user
                            ? `${participant.user.firstName} ${participant.user.lastName}`
                            : participant.userId}
                        </div>
                        <small className="t-sub">
                          {participant.role === 'organisateur'
                            ? 'Organisateur'
                            : participant.role === 'optionnel'
                              ? 'Optionnel'
                              : 'Participant'}
                        </small>
                      </div>
                    </div>
                    <Pill tone={participantTone(participant.status)} dot>
                      {participantStatusLabel(participant.status)}
                    </Pill>
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-sub" style={{ margin: 0 }}>Aucun participant ajouté</p>
            )}
          </Card>

          {appointment.notes && (
            <Card head="Notes" icon="fileText">
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
                {appointment.notes}
              </p>
            </Card>
          )}

          {appointment.outcome && (
            <Card head="Compte-rendu" icon="flame">
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
                {appointment.outcome}
              </p>
            </Card>
          )}

          {appointment.cancellationReason && (
            <Card head="Raison de l'annulation" icon="x">
              <p style={{ margin: 0, color: 'var(--danger-ink)' }}>{appointment.cancellationReason}</p>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {(appointment.lead || appointment.client || appointment.projectId) && (
            <Card head="Liens" icon="folder">
              {appointment.lead && (
                <div style={{ marginBottom: 14 }}>
                  <div className="field-label">Lead</div>
                  <button className="contact-link" onClick={() => navigate(`/leads/${appointment.lead!.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <Icon name="user" size={14} />
                    {appointment.lead.firstName} {appointment.lead.lastName}
                    {appointment.lead.title && <span className="t-sub"> – {appointment.lead.title}</span>}
                  </button>
                </div>
              )}
              {appointment.client && (
                <div style={{ marginBottom: 14 }}>
                  <div className="field-label">Client</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="building" size={14} />
                    {appointment.client.firstName} {appointment.client.lastName}
                  </div>
                </div>
              )}
              {appointment.projectId && (
                <div>
                  <div className="field-label">Projet</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="folder" size={14} />
                    {appointment.projectId}
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card head="Informations" icon="inbox">
            <div style={{ fontSize: 13.5 }}>
              <div className="field-label">Créé le</div>
              <div style={{ marginBottom: 12 }}>{formatDateTime(appointment.createdAt)}</div>
              <div className="field-label">Modifié le</div>
              <div>{formatDateTime(appointment.updatedAt)}</div>
            </div>
          </Card>

          <Card flush>
            <div style={{ padding: 16 }}>
              {!showDeleteConfirm ? (
                <Btn variant="danger-ghost" icon="trash" onClick={() => setShowDeleteConfirm(true)} style={{ width: '100%' }}>
                  Supprimer ce rendez-vous
                </Btn>
              ) : (
                <div>
                  <p style={{ color: 'var(--danger-ink)', fontSize: 13, marginTop: 0, marginBottom: 10 }}>
                    Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn
                      variant="danger"
                      icon="trash"
                      onClick={() => handleAction('delete')}
                      disabled={actionLoading === 'delete'}
                      style={{ flex: 1 }}
                    >
                      Confirmer
                    </Btn>
                    <Btn variant="subtle" onClick={() => setShowDeleteConfirm(false)}>
                      Annuler
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {showCancelModal && (
        <div className="neo-modal-scrim" onClick={() => setShowCancelModal(false)}>
          <div className="neo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neo-modal-head">
              <b>Annuler le rendez-vous</b>
              <button className="icon-btn" aria-label="Fermer" onClick={() => setShowCancelModal(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="neo-modal-body">
              <div className="field-label">
                Raison de l'annulation <span style={{ color: 'var(--danger)' }}>*</span>
              </div>
              <textarea
                className="neo-field"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indiquez la raison de l'annulation..."
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <Btn variant="subtle" onClick={() => setShowCancelModal(false)}>
                  Fermer
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => handleAction('cancel')}
                  disabled={!cancelReason.trim() || actionLoading === 'cancel'}
                >
                  Annuler le rendez-vous
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="neo-modal-scrim" onClick={() => setShowCompleteModal(false)}>
          <div className="neo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neo-modal-head">
              <b>Terminer le rendez-vous</b>
              <button className="icon-btn" aria-label="Fermer" onClick={() => setShowCompleteModal(false)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="neo-modal-body">
              <div className="field-label">Compte-rendu</div>
              <textarea
                className="neo-field"
                rows={4}
                value={completeOutcome}
                onChange={(e) => setCompleteOutcome(e.target.value)}
                placeholder="Résumé du rendez-vous, décisions prises, prochaines étapes..."
                style={{ resize: 'vertical' }}
              />
              <div className="field-label" style={{ marginTop: 14 }}>Durée réelle (minutes)</div>
              <input
                className="neo-field"
                type="number"
                value={completeDuration || ''}
                onChange={(e) => setCompleteDuration(e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <Btn variant="subtle" onClick={() => setShowCompleteModal(false)}>
                  Fermer
                </Btn>
                <Btn variant="success" icon="checkCircle" onClick={() => handleAction('complete')} disabled={actionLoading === 'complete'}>
                  Terminer
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentDetailPage;
