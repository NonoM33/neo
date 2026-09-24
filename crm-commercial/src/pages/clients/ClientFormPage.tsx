import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
import { clientsService } from '../../services';
import type { CreateClientInput, UpdateClientInput } from '../../types';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  notes: '',
};

export function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    clientsService
      .getClient(id)
      .then((client) =>
        setForm({
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email ?? '',
          phone: client.phone ?? '',
          address: client.address ?? '',
          city: client.city ?? '',
          postalCode: client.postalCode ?? '',
          notes: client.notes ?? '',
        }),
      )
      .catch(() => {
        toast.error('Client introuvable');
        navigate('/clients');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CreateClientInput & UpdateClientInput = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        postalCode: form.postalCode || undefined,
        notes: form.notes || undefined,
      };
      if (isEdit && id) {
        await clientsService.updateClient(id, payload);
        toast.success('Client mis à jour');
      } else {
        await clientsService.createClient(payload);
        toast.success('Client créé');
      }
      navigate('/clients');
    } catch (error) {
      console.error('Failed to save client:', error);
      toast.error("Échec de l'enregistrement");
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
          <button className="back-link" onClick={() => navigate('/clients')}>
            <Icon name="arrowLeft" size={15} /> Retour aux clients
          </button>
          <h1>{isEdit ? 'Modifier le client' : 'Nouveau client'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card head="Coordonnées" icon="user">
          <div className="card-body">
            <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <div>
                <div className="field-label">Prénom *</div>
                <input
                  className="neo-field"
                  required
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                />
              </div>
              <div>
                <div className="field-label">Nom *</div>
                <input
                  className="neo-field"
                  required
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                />
              </div>
            </div>
            <div className="field-grid">
              <div>
                <div className="field-label">Email</div>
                <input
                  type="email"
                  className="neo-field"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div>
                <div className="field-label">Téléphone</div>
                <input
                  className="neo-field"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Adresse</div>
              <input
                className="neo-field"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </div>
            <div className="field-grid">
              <div>
                <div className="field-label">Ville</div>
                <input
                  className="neo-field"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div>
                <div className="field-label">Code postal</div>
                <input
                  className="neo-field"
                  value={form.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Notes</div>
              <textarea
                className="neo-field"
                rows={3}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Btn type="button" variant="subtle" onClick={() => navigate('/clients')}>
            Annuler
          </Btn>
          <Btn type="submit" icon="check" disabled={saving}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

export default ClientFormPage;
