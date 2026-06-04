import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '../../components';
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
        })
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
          onClick={() => navigate('/clients')}
        >
          Retour
        </Button>
        <h1 className="page-title mb-0">{isEdit ? 'Modifier' : 'Nouveau'} client</h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Prénom</label>
                <input
                  className="form-control"
                  required
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Nom</label>
                <input
                  className="form-control"
                  required
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Téléphone</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Adresse</label>
                <input
                  className="form-control"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label">Ville</label>
                <input
                  className="form-control"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Code postal</label>
                <input
                  className="form-control"
                  value={form.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button type="button" variant="outline-secondary" onClick={() => navigate('/clients')}>
                Annuler
              </Button>
              <Button type="submit" loading={saving} icon="bi-check-lg">
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default ClientFormPage;
