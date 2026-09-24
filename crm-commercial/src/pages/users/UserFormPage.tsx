import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
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
        }),
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
    return <Spinner />;
  }

  return (
    <div style={{ padding: 28, maxWidth: 820, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/users')}>
            <Icon name="arrowLeft" size={15} /> Retour aux utilisateurs
          </button>
          <h1>{isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card head="Compte" icon="user">
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
                <div className="field-label">Email *</div>
                <input
                  type="email"
                  className="neo-field"
                  required
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
            <div className="field-grid">
              <div>
                <div className="field-label">
                  Mot de passe{' '}
                  {isEdit && (
                    <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(laisser vide pour conserver)</span>
                  )}
                </div>
                <input
                  type="password"
                  className="neo-field"
                  required={!isEdit}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
              </div>
              <div>
                <div className="field-label">Rôle</div>
                <select
                  className="neo-field"
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
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Btn type="button" variant="subtle" onClick={() => navigate('/users')}>
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

export default UserFormPage;
