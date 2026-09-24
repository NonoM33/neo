import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
import { clientsService, ticketsService } from '../../services';
import {
  ticketPriorityLabels,
  ticketSourceLabels,
  type Client,
  type CreateTicketInput,
  type TicketPriority,
  type TicketSource,
} from '../../types';

interface FormState {
  clientId: string;
  title: string;
  description: string;
  priority: TicketPriority;
  source: TicketSource;
}

const EMPTY: FormState = {
  clientId: '',
  title: '',
  description: '',
  priority: 'normale',
  source: 'portail',
};

export function TicketFormPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    clientsService
      .getClients(undefined, 1, 100)
      .then((result) => {
        if (!cancelled) setClients(result.data);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Chargement des clients impossible');
          navigate('/tickets');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CreateTicketInput = {
        clientId: form.clientId,
        title: form.title,
        description: form.description,
        priority: form.priority,
        source: form.source,
      };
      const ticket = await ticketsService.createTicket(payload);
      toast.success('Ticket créé');
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Échec de la création');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div style={{ padding: 28, maxWidth: 820, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/tickets')}>
            <Icon name="arrowLeft" size={15} /> Retour aux tickets
          </button>
          <h1>Nouveau ticket</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card head="Ticket" icon="ticket">
          <div className="card-body">
            <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <div>
                <div className="field-label">Client *</div>
                <select
                  className="neo-field"
                  required
                  value={form.clientId}
                  onChange={(e) => update('clientId', e.target.value)}
                >
                  <option value="" disabled>
                    Sélectionner un client…
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="field-label">Titre *</div>
                <input
                  className="neo-field"
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Description *</div>
              <textarea
                className="neo-field"
                rows={5}
                required
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
            <div className="field-grid">
              <div>
                <div className="field-label">Priorité</div>
                <select
                  className="neo-field"
                  value={form.priority}
                  onChange={(e) => update('priority', e.target.value as TicketPriority)}
                >
                  {(Object.keys(ticketPriorityLabels) as TicketPriority[]).map((p) => (
                    <option key={p} value={p}>
                      {ticketPriorityLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="field-label">Source</div>
                <select
                  className="neo-field"
                  value={form.source}
                  onChange={(e) => update('source', e.target.value as TicketSource)}
                >
                  {(Object.keys(ticketSourceLabels) as TicketSource[]).map((s) => (
                    <option key={s} value={s}>
                      {ticketSourceLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Btn type="button" variant="subtle" onClick={() => navigate('/tickets')}>
            Annuler
          </Btn>
          <Btn type="submit" icon="check" disabled={saving}>
            {saving ? 'Création…' : 'Créer'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

export default TicketFormPage;
