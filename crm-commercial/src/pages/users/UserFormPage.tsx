import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '../../components';
import { usersService } from '../../services';
import {
  staffRoleLabels,
  type StaffRole,
  type CreateStaffUserInput,
  type UpdateStaffUserInput,
} from '../../types';

interface FormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: StaffRole;
}

const EMPTY: FormState = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'integrateur',
};

export function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    usersService
      .getUser(id)
      .then((user) =>
        setForm({
          email: user.email,
          password: '',
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone ?? '',
          role: user.role,
        })
      )
      .catch(() => {
        toast.error('Utilisateur introuvable');
        navigate('/users');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && id) {
        const payload: UpdateStaffUserInput = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await usersService.updateUser(id, payload);
        toast.success('Utilisateur mis à jour');
      } else {
        const payload: CreateStaffUserInput = {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          role: form.role,
        };
        await usersService.createUser(payload);
        toast.success('Utilisateur créé');
      }
      navigate('/users');
    } catch (error) {
      console.error('Failed to save user:', error);
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
        <Button variant="outline-secondary" size="sm" icon="bi-arrow-left" onClick={() => navigate('/users')}>
          Retour
        </Button>
        <h1 className="page-title mb-0">{isEdit ? 'Modifier' : 'Nouvel'} utilisateur</h1>
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
                  required
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
              <div className="col-md-6">
                <label className="form-label">
                  Mot de passe {isEdit && <span className="text-secondary">(laisser vide pour conserver)</span>}
                </label>
                <input
                  type="password"
                  className="form-control"
                  required={!isEdit}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Rôle</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => update('role', e.target.value as StaffRole)}
                >
                  {(Object.keys(staffRoleLabels) as StaffRole[]).map((r) => (
                    <option key={r} value={r}>
                      {staffRoleLabels[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button type="button" variant="outline-secondary" onClick={() => navigate('/users')}>
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

export default UserFormPage;
