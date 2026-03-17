import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button } from '../../components';
import { appointmentsService } from '../../services/appointments.service';
import type { Appointment, AppointmentStatus } from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_TYPE_ICONS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  LOCATION_TYPE_LABELS,
} from '../../types/appointment.types';

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

  useEffect(() => {
    if (id) loadAppointment();
  }, [id]);

  const loadAppointment = async () => {
    try {
      const data = await appointmentsService.getAppointment(id!);
      setAppointment(data);
    } catch (error) {
      console.error('Erreur lors du chargement du rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline-primary' | 'outline-secondary';

  const getAvailableActions = (status: AppointmentStatus): { key: string; label: string; icon: string; variant: ButtonVariant }[] => {
    switch (status) {
      case 'propose':
        return [
          { key: 'confirm', label: 'Confirmer', icon: 'bi-check-circle', variant: 'primary' },
          { key: 'cancel', label: 'Annuler', icon: 'bi-x-circle', variant: 'danger' },
        ];
      case 'confirme':
        return [
          { key: 'start', label: 'Démarrer', icon: 'bi-play-circle', variant: 'success' },
          { key: 'cancel', label: 'Annuler', icon: 'bi-x-circle', variant: 'danger' },
          { key: 'no_show', label: 'No-show', icon: 'bi-person-x', variant: 'warning' },
        ];
      case 'en_cours':
        return [
          { key: 'complete', label: 'Terminer', icon: 'bi-check-circle-fill', variant: 'success' },
          { key: 'cancel', label: 'Annuler', icon: 'bi-x-circle', variant: 'danger' },
        ];
      default:
        return [];
    }
  };

  const getParticipantStatusBadge = (status: string) => {
    switch (status) {
      case 'accepte':
        return 'bg-success';
      case 'refuse':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  const getParticipantStatusLabel = (status: string) => {
    switch (status) {
      case 'accepte':
        return 'Accepté';
      case 'refuse':
        return 'Refusé';
      default:
        return 'En attente';
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (!appointment) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-exclamation-triangle fs-1 text-muted"></i>
        <p className="text-muted mt-2">Rendez-vous non trouvé</p>
        <Button onClick={() => navigate('/calendar')}>Retour à l'agenda</Button>
      </div>
    );
  }

  const actions = getAvailableActions(appointment.status);
  const typeColor = APPOINTMENT_TYPE_COLORS[appointment.type];
  const statusColor = APPOINTMENT_STATUS_COLORS[appointment.status];

  return (
    <div className="appointment-detail">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate('/calendar')}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour à l'agenda
          </button>
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded"
              style={{
                width: 48,
                height: 48,
                backgroundColor: typeColor,
                color: '#fff',
                fontSize: '1.3rem',
              }}
            >
              <i className={`bi ${APPOINTMENT_TYPE_ICONS[appointment.type]}`}></i>
            </div>
            <div>
              <h2 className="mb-1" style={{ fontWeight: 600 }}>{appointment.title}</h2>
              <div className="d-flex align-items-center gap-2">
                <span
                  className="badge"
                  style={{ backgroundColor: typeColor, color: '#fff' }}
                >
                  {APPOINTMENT_TYPE_LABELS[appointment.type]}
                </span>
                <span
                  className="badge"
                  style={{ backgroundColor: statusColor, color: '#fff' }}
                >
                  {APPOINTMENT_STATUS_LABELS[appointment.status]}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          {actions.length === 0 && appointment.status !== 'termine' && appointment.status !== 'annule' && appointment.status !== 'no_show' && (
            <Button variant="outline-primary" icon="bi-pencil" onClick={() => navigate(`/calendar/${appointment.id}/edit`)}>
              Modifier
            </Button>
          )}
          {(appointment.status === 'propose' || appointment.status === 'confirme') && (
            <Button variant="outline-primary" icon="bi-pencil" onClick={() => navigate(`/calendar/${appointment.id}/edit`)}>
              Modifier
            </Button>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Main Content */}
        <div className="col-lg-8">
          {/* Date & Time */}
          <Card className="mb-4">
            <CardHeader>
              <i className="bi bi-clock me-2"></i>
              Date et horaire
            </CardHeader>
            <CardBody>
              <div className="row">
                <div className="col-md-4">
                  <div className="text-muted small mb-1">Date</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(appointment.scheduledAt)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted small mb-1">Horaire</div>
                  <div style={{ fontWeight: 500 }}>
                    {formatTime(appointment.scheduledAt)} - {formatTime(appointment.endAt)}
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted small mb-1">Durée</div>
                  <div style={{ fontWeight: 500 }}>{formatDuration(appointment.duration)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted small mb-1">Lieu</div>
                  <div style={{ fontWeight: 500 }}>
                    <i className={`bi ${
                      appointment.locationType === 'visio' ? 'bi-camera-video' :
                      appointment.locationType === 'telephone' ? 'bi-telephone' :
                      appointment.locationType === 'bureau' ? 'bi-building' :
                      'bi-geo-alt'
                    } me-1`}></i>
                    {LOCATION_TYPE_LABELS[appointment.locationType]}
                  </div>
                  {appointment.location && (
                    <div className="text-muted small mt-1">{appointment.location}</div>
                  )}
                  {appointment.location && (appointment.locationType === 'sur_site' || appointment.locationType === 'bureau') && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appointment.location)}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary mt-2"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <i className="bi bi-map me-1"></i>
                      Itinéraire
                    </a>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Action Buttons */}
          {actions.length > 0 && (
            <Card className="mb-4">
              <CardBody>
                <div className="d-flex gap-2 flex-wrap">
                  {actions.map((action) => (
                    <Button
                      key={action.key}
                      variant={action.variant}
                      icon={action.icon}
                      loading={actionLoading === action.key}
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
                    </Button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Organizer & Participants */}
          <Card className="mb-4">
            <CardHeader>
              <i className="bi bi-people me-2"></i>
              Participants
            </CardHeader>
            <CardBody>
              {/* Organizer */}
              {appointment.organizer && (
                <div className="d-flex align-items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid var(--neo-border-color)' }}>
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: 'var(--neo-primary)',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    {appointment.organizer.firstName.charAt(0)}{appointment.organizer.lastName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {appointment.organizer.firstName} {appointment.organizer.lastName}
                    </div>
                    <small className="text-muted">Organisateur</small>
                  </div>
                </div>
              )}

              {/* Participants */}
              {appointment.participants && appointment.participants.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {appointment.participants.map((participant) => (
                    <div key={participant.id} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 36,
                            height: 36,
                            backgroundColor: 'var(--neo-bg-light)',
                            color: 'var(--neo-text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          {participant.user
                            ? `${participant.user.firstName.charAt(0)}${participant.user.lastName.charAt(0)}`
                            : <i className="bi bi-person"></i>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                            {participant.user
                              ? `${participant.user.firstName} ${participant.user.lastName}`
                              : participant.userId}
                          </div>
                          <small className="text-muted">
                            {participant.role === 'organisateur' ? 'Organisateur' : participant.role === 'optionnel' ? 'Optionnel' : 'Participant'}
                          </small>
                        </div>
                      </div>
                      <span className={`badge ${getParticipantStatusBadge(participant.status)}`}>
                        {getParticipantStatusLabel(participant.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">Aucun participant ajouté</p>
              )}
            </CardBody>
          </Card>

          {/* Notes */}
          {appointment.notes && (
            <Card className="mb-4">
              <CardHeader>
                <i className="bi bi-journal-text me-2"></i>
                Notes
              </CardHeader>
              <CardBody>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{appointment.notes}</p>
              </CardBody>
            </Card>
          )}

          {/* Outcome */}
          {appointment.outcome && (
            <Card className="mb-4">
              <CardHeader>
                <i className="bi bi-flag me-2"></i>
                Compte-rendu
              </CardHeader>
              <CardBody>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{appointment.outcome}</p>
              </CardBody>
            </Card>
          )}

          {/* Cancellation Reason */}
          {appointment.cancellationReason && (
            <Card className="mb-4">
              <CardHeader>
                <i className="bi bi-x-circle me-2 text-danger"></i>
                Raison de l'annulation
              </CardHeader>
              <CardBody>
                <p className="mb-0">{appointment.cancellationReason}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          {/* Linked Entities */}
          {(appointment.lead || appointment.client || appointment.projectId) && (
            <Card className="mb-4">
              <CardHeader>
                <i className="bi bi-link-45deg me-2"></i>
                Liens
              </CardHeader>
              <CardBody>
                {appointment.lead && (
                  <div className="mb-3">
                    <div className="text-muted small mb-1">Lead</div>
                    <button
                      className="btn btn-link p-0 text-start"
                      onClick={() => navigate(`/leads/${appointment.lead!.id}`)}
                    >
                      <i className="bi bi-person me-1"></i>
                      {appointment.lead.firstName} {appointment.lead.lastName}
                      {appointment.lead.title && (
                        <span className="text-muted ms-1">- {appointment.lead.title}</span>
                      )}
                    </button>
                  </div>
                )}

                {appointment.client && (
                  <div className="mb-3">
                    <div className="text-muted small mb-1">Client</div>
                    <div>
                      <i className="bi bi-building me-1"></i>
                      {appointment.client.firstName} {appointment.client.lastName}
                    </div>
                  </div>
                )}

                {appointment.projectId && (
                  <div className="mb-3">
                    <div className="text-muted small mb-1">Projet</div>
                    <div>
                      <i className="bi bi-folder me-1"></i>
                      {appointment.projectId}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Metadata */}
          <Card className="mb-4">
            <CardHeader>Informations</CardHeader>
            <CardBody>
              <dl className="mb-0" style={{ fontSize: '0.9rem' }}>
                <dt className="text-muted small">Créé le</dt>
                <dd>{formatDateTime(appointment.createdAt)}</dd>
                <dt className="text-muted small">Modifié le</dt>
                <dd className="mb-0">{formatDateTime(appointment.updatedAt)}</dd>
              </dl>
            </CardBody>
          </Card>

          {/* Danger Zone */}
          <Card>
            <CardBody>
              {!showDeleteConfirm ? (
                <button
                  className="btn btn-outline-danger btn-sm w-100"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <i className="bi bi-trash me-2"></i>
                  Supprimer ce rendez-vous
                </button>
              ) : (
                <div>
                  <p className="text-danger mb-2" style={{ fontSize: '0.875rem' }}>
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.
                  </p>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-danger btn-sm flex-grow-1"
                      onClick={() => handleAction('delete')}
                      disabled={actionLoading === 'delete'}
                    >
                      {actionLoading === 'delete' ? (
                        <span className="spinner-border spinner-border-sm me-1"></span>
                      ) : (
                        <i className="bi bi-trash me-1"></i>
                      )}
                      Confirmer
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Annuler le rendez-vous</h5>
                <button type="button" className="btn-close" onClick={() => setShowCancelModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Raison de l'annulation <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Indiquez la raison de l'annulation..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                  Fermer
                </button>
                <Button
                  variant="danger"
                  loading={actionLoading === 'cancel'}
                  onClick={() => handleAction('cancel')}
                  disabled={!cancelReason.trim()}
                >
                  Annuler le rendez-vous
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Terminer le rendez-vous</h5>
                <button type="button" className="btn-close" onClick={() => setShowCompleteModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Compte-rendu</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={completeOutcome}
                    onChange={(e) => setCompleteOutcome(e.target.value)}
                    placeholder="Résumé du rendez-vous, décisions prises, prochaines étapes..."
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Durée réelle (minutes)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={completeDuration || ''}
                    onChange={(e) => setCompleteDuration(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>
                  Fermer
                </button>
                <Button
                  variant="success"
                  icon="bi-check-circle"
                  loading={actionLoading === 'complete'}
                  onClick={() => handleAction('complete')}
                >
                  Terminer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppointmentDetailPage;
