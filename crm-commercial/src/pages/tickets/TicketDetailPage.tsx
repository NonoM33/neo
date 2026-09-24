import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
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

const STATUS_TONE: Record<TicketStatus, PillTone> = {
  nouveau: 'info',
  ouvert: 'info',
  en_attente_client: 'warning',
  en_attente_interne: 'neutral',
  escalade: 'danger',
  resolu: 'success',
  ferme: 'dark',
};

const PRIORITY_TONE: Record<TicketPriority, PillTone> = {
  basse: 'neutral',
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
    return <Spinner />;
  }

  const availableTransitions = STATUS_TRANSITIONS[ticket.status];

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/tickets')}>
            <Icon name="arrowLeft" size={15} /> Retour aux tickets
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1>{ticket.number}</h1>
            <Pill tone={STATUS_TONE[ticket.status]} dot>
              {ticketStatusLabels[ticket.status]}
            </Pill>
            <Pill tone={PRIORITY_TONE[ticket.priority]}>{ticketPriorityLabels[ticket.priority]}</Pill>
            {ticket.slaBreached && <Pill tone="danger">SLA dépassé</Pill>}
          </div>
        </div>
        <div className="page-actions">
          <Btn variant="danger" icon="zap" disabled={busy} onClick={handleEscalate}>
            Escalader
          </Btn>
        </div>
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head={ticket.title} icon="ticket">
            <div className="card-body">
              <p style={{ color: 'var(--ink-3)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                {ticket.description}
              </p>
              {ticket.aiDiagnosis && (
                <div style={{ marginTop: 16 }}>
                  <div className="field-label">Diagnostic IA</div>
                  <p style={{ color: 'var(--ink-3)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                    {ticket.aiDiagnosis}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card head="Commentaires" icon="mail">
            <div className="card-body">
              {ticket.comments.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', margin: 0 }}>Aucun commentaire</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ticket.comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: 13,
                        borderRadius: 8,
                        background: 'var(--paper-2)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>
                          {c.authorType}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {c.type === 'interne' && <Pill tone="ochre">Interne</Pill>}
                          <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                            {formatDateTime(c.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{c.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} style={{ marginTop: 14 }}>
                <textarea
                  className="neo-field"
                  rows={3}
                  placeholder="Ajouter un commentaire…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <select
                    className="neo-field"
                    style={{ width: 'auto' }}
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as 'public' | 'interne')}
                  >
                    <option value="public">Public (visible client)</option>
                    <option value="interne">Interne (staff)</option>
                  </select>
                  <Btn type="submit" icon="send" disabled={busy || !comment.trim()}>
                    Envoyer
                  </Btn>
                </div>
              </form>
            </div>
          </Card>

          <Card head="Historique" icon="clock">
            <div className="card-body">
              {ticket.history.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', margin: 0 }}>Aucun évènement</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {ticket.history.map((h) => (
                    <li
                      key={h.id}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '8px 0',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <span style={{ color: 'var(--ink-3)', fontSize: 12, minWidth: 140 }}>
                        {formatDateTime(h.createdAt)}
                      </span>
                      <span style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{h.changeType}</span>
                        {h.field ? ` · ${h.field}` : ''}
                        {h.oldValue || h.newValue ? (
                          <span style={{ color: 'var(--ink-3)' }}>
                            {' '}
                            {h.oldValue ?? '∅'} → {h.newValue ?? '∅'}
                          </span>
                        ) : null}
                        {h.notes && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{h.notes}</div>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Détails" icon="inbox">
            <div className="card-body">
              <dl className="detail-dl">
                <div>
                  <dt>Client</dt>
                  <dd>
                    {ticket.client.firstName} {ticket.client.lastName}
                  </dd>
                </div>
                <div>
                  <dt>Catégorie</dt>
                  <dd>{categoryName(ticket.category)}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{ticketSourceLabels[ticket.source]}</dd>
                </div>
                <div>
                  <dt>Escalade</dt>
                  <dd>Niveau {ticket.escalationLevel}</dd>
                </div>
                <div>
                  <dt>Créé le</dt>
                  <dd>{formatDateTime(ticket.createdAt)}</dd>
                </div>
                <div>
                  <dt>Échéance résol.</dt>
                  <dd>{formatDateTime(ticket.resolutionDueAt)}</dd>
                </div>
                <div>
                  <dt>Résolu le</dt>
                  <dd>{formatDateTime(ticket.resolvedAt)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Changer le statut" icon="gauge">
            <div className="card-body">
              <select
                className="neo-field"
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
            </div>
          </Card>

          <Card head="Assigné à" icon="user">
            <div className="card-body">
              <select
                className="neo-field"
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;
