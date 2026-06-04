import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '../../components';
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
      toast.error("Échec de la création");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-area">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Button
          variant="outline-secondary"
          size="sm"
          icon="bi-arrow-left"
          onClick={() => navigate('/tickets')}
        >
          Retour
        </Button>
        <h1 className="page-title mb-0">Nouveau ticket</h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Client</label>
                <select
                  className="form-select"
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
              <div className="col-md-6">
                <label className="form-label">Titre</label>
                <input
                  className="form-control"
                  required
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Priorité</label>
                <select
                  className="form-select"
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
              <div className="col-md-6">
                <label className="form-label">Source</label>
                <select
                  className="form-select"
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

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button type="button" variant="outline-secondary" onClick={() => navigate('/tickets')}>
                Annuler
              </Button>
              <Button type="submit" loading={saving} icon="bi-check-lg">
                Créer
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default TicketFormPage;
