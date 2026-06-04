import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '../../components';
import { ticketsService, usersService } from '../../services';
import {
  ticketPriorityLabels,
  ticketSourceLabels,
  ticketStatusLabels,
  type StaffUser,
  type TicketDetail,
  type TicketPriority,
  type TicketStatus,
} from '../../types';
import { assigneeId, categoryName } from './ticket-display';

const STATUS_VARIANT: Record<TicketStatus, string> = {
  nouveau: 'info',
  ouvert: 'primary',
  en_attente_client: 'warning',
  en_attente_interne: 'secondary',
  escalade: 'danger',
  resolu: 'success',
  ferme: 'dark',
};

const PRIORITY_VARIANT: Record<TicketPriority, string> = {
  basse: 'secondary',
  normale: 'info',
  haute: 'warning',
  urgente: 'danger',
  critique: 'danger',
};

// Reflète getValidStatusTransitions côté backend : transitions de statut autorisées.
const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  nouveau: ['ouvert', 'escalade', 'ferme'],
  ouvert: ['en_attente_client', 'en_attente_interne', 'escalade', 'resolu', 'ferme'],
  en_attente_client: ['ouvert', 'resolu', 'ferme'],
  en_attente_interne: ['ouvert', 'escalade', 'ferme'],
  escalade: ['ouvert', 'en_attente_interne', 'resolu', 'ferme'],
  resolu: ['ouvert', 'ferme'],
  ferme: ['ouvert'],
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR');
}

function userLabel(user: { firstName: string | null; lastName: string | null }): string {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—';
}

export function TicketDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [comment, setComment] = useState('');
  const [commentType, setCommentType] = useState<'public' | 'interne'>('public');

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setTicket(await ticketsService.getTicket(id));
    } catch (error) {
      console.error('Failed to load ticket:', error);
      toast.error('Ticket introuvable');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  useEffect(() => {
    usersService
      .getUsers(undefined, 1, 100)
      .then((result) => setStaff(result.data))
      .catch((error) => console.error('Failed to load staff:', error));
  }, []);

  const handleStatusChange = async (status: TicketStatus) => {
    if (!id || !ticket || status === ticket.status) return;
    setBusy(true);
    try {
      await ticketsService.changeStatus(id, status);
      toast.success('Statut mis à jour');
      await loadTicket();
    } catch (error) {
      console.error('Failed to change status:', error);
      toast.error('Transition de statut invalide');
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (assignedToId: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await ticketsService.assignTicket(id, assignedToId || null);
      toast.success('Assignation mise à jour');
      await loadTicket();
    } catch (error) {
      console.error('Failed to assign ticket:', error);
      toast.error("Échec de l'assignation");
    } finally {
      setBusy(false);
    }
  };

  const handleEscalate = async () => {
    if (!id) return;
    if (!window.confirm('Escalader ce ticket ?')) return;
    setBusy(true);
    try {
      await ticketsService.escalateTicket(id);
      toast.success('Ticket escaladé');
      await loadTicket();
    } catch (error) {
      console.error('Failed to escalate ticket:', error);
      toast.error("Échec de l'escalade");
    } finally {
      setBusy(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !comment.trim()) return;
    setBusy(true);
    try {
      await ticketsService.addComment(id, { content: comment.trim(), type: commentType });
      setComment('');
      toast.success('Commentaire ajouté');
      await loadTicket();
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error("Échec de l'ajout du commentaire");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="content-area">
        <Spinner />
      </div>
    );
  }

  const availableTransitions = STATUS_TRANSITIONS[ticket.status];

  return (
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            icon="bi-arrow-left"
            onClick={() => navigate('/tickets')}
          >
            Retour
          </Button>
          <h1 className="page-title mb-0">{ticket.number}</h1>
          <span className={`badge bg-${STATUS_VARIANT[ticket.status]}`}>
            {ticketStatusLabels[ticket.status]}
          </span>
          <span className={`badge bg-${PRIORITY_VARIANT[ticket.priority]}`}>
            {ticketPriorityLabels[ticket.priority]}
          </span>
          {ticket.slaBreached && <span className="badge bg-danger">SLA dépassé</span>}
        </div>
        <Button
          variant="danger"
          icon="bi-arrow-up-circle"
          loading={busy}
          onClick={handleEscalate}
        >
          Escalader
        </Button>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <Card className="mb-4">
            <CardBody>
              <h2 className="card-title h5 mb-2">{ticket.title}</h2>
              <p className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                {ticket.description}
              </p>
              {ticket.aiDiagnosis && (
                <div className="mt-3">
                  <label className="form-label">Diagnostic IA</label>
                  <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {ticket.aiDiagnosis}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody>
              <h2 className="card-title h5 mb-3">Commentaires</h2>
              {ticket.comments.length === 0 ? (
                <p className="text-secondary">Aucun commentaire</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {ticket.comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded"
                      style={{ background: 'var(--neo-bg-card)', border: '1px solid var(--neo-border-color)' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold small text-capitalize">{c.authorType}</span>
                        <div className="d-flex align-items-center gap-2">
                          {c.type === 'interne' && (
                            <span className="badge border text-body-secondary">Interne</span>
                          )}
                          <span className="text-secondary small">{formatDateTime(c.createdAt)}</span>
                        </div>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} className="mt-3">
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  placeholder="Ajouter un commentaire…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="d-flex justify-content-between align-items-center">
                  <select
                    className="form-select w-auto"
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as 'public' | 'interne')}
                  >
                    <option value="public">Public (visible client)</option>
                    <option value="interne">Interne (staff)</option>
                  </select>
                  <Button type="submit" icon="bi-send" loading={busy} disabled={!comment.trim()}>
                    Envoyer
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="card-title h5 mb-3">Historique</h2>
              {ticket.history.length === 0 ? (
                <p className="text-secondary">Aucun évènement</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {ticket.history.map((h) => (
                    <li key={h.id} className="d-flex gap-3 py-2 border-bottom">
                      <span className="text-secondary small" style={{ minWidth: 140 }}>
                        {formatDateTime(h.createdAt)}
                      </span>
                      <span>
                        <span className="fw-semibold">{h.changeType}</span>
                        {h.field ? ` · ${h.field}` : ''}
                        {h.oldValue || h.newValue ? (
                          <span className="text-secondary">
                            {' '}
                            {h.oldValue ?? '∅'} → {h.newValue ?? '∅'}
                          </span>
                        ) : null}
                        {h.notes && <div className="text-secondary small">{h.notes}</div>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="col-lg-4">
          <Card className="mb-4">
            <CardBody>
              <h2 className="card-title h5 mb-3">Détails</h2>
              <dl className="row mb-0">
                <dt className="col-5 text-secondary fw-normal">Client</dt>
                <dd className="col-7">
                  {ticket.client.firstName} {ticket.client.lastName}
                </dd>
                <dt className="col-5 text-secondary fw-normal">Catégorie</dt>
                <dd className="col-7">{categoryName(ticket.category)}</dd>
                <dt className="col-5 text-secondary fw-normal">Source</dt>
                <dd className="col-7">{ticketSourceLabels[ticket.source]}</dd>
                <dt className="col-5 text-secondary fw-normal">Escalade</dt>
                <dd className="col-7">Niveau {ticket.escalationLevel}</dd>
                <dt className="col-5 text-secondary fw-normal">Créé le</dt>
                <dd className="col-7">{formatDateTime(ticket.createdAt)}</dd>
                <dt className="col-5 text-secondary fw-normal">Échéance résol.</dt>
                <dd className="col-7">{formatDateTime(ticket.resolutionDueAt)}</dd>
                <dt className="col-5 text-secondary fw-normal">Résolu le</dt>
                <dd className="col-7">{formatDateTime(ticket.resolvedAt)}</dd>
              </dl>
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardBody>
              <label className="form-label">Changer le statut</label>
              <select
                className="form-select"
                value={ticket.status}
                disabled={busy}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              >
                <option value={ticket.status}>{ticketStatusLabels[ticket.status]} (actuel)</option>
                {availableTransitions.map((s) => (
                  <option key={s} value={s}>
                    {ticketStatusLabels[s]}
                  </option>
                ))}
              </select>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <label className="form-label">Assigné à</label>
              <select
                className="form-select"
                value={assigneeId(ticket.assignedTo)}
                disabled={busy}
                onChange={(e) => handleAssign(e.target.value)}
              >
                <option value="">Non assigné</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userLabel(u)}
                  </option>
                ))}
              </select>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;
