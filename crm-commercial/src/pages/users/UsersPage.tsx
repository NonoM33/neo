import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Table, Button } from '../../components';
import { usersService } from '../../services';
import { staffRoleLabels, type StaffRole, type StaffUser } from '../../types';

const PAGE_SIZE = 20;

const ROLE_VARIANT: Record<StaffRole, string> = {
  admin: 'danger',
  integrateur: 'primary',
  auditeur: 'secondary',
};

export function UsersPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | StaffRole>('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const filter = { search: search.trim() || undefined, role: role || undefined };
      const response = await usersService.getUsers(filter, page, PAGE_SIZE);
      setUsers(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  // Reset to page 1 when filters change (léger debounce sur la recherche).
  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search, role]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (user: StaffUser) => {
    if (!window.confirm(`Supprimer l'utilisateur « ${user.firstName} ${user.lastName} » ?`)) return;
    try {
      await usersService.deleteUser(user.id);
      toast.success('Utilisateur supprimé');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Suppression impossible');
    }
  };

  return (
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="text-secondary mb-0">{total} compte{total > 1 ? 's' : ''} staff</p>
        </div>
        <Button icon="bi-plus-lg" onClick={() => navigate('/users/new')}>
          Nouvel utilisateur
        </Button>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-transparent">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Rechercher par nom ou email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as '' | StaffRole)}
              >
                <option value="">Tous les rôles</option>
                {(Object.keys(staffRoleLabels) as StaffRole[]).map((r) => (
                  <option key={r} value={r}>
                    {staffRoleLabels[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Table<StaffUser>
            loading={loading}
            data={users}
            keyExtractor={(u) => u.id}
            emptyMessage="Aucun utilisateur"
            columns={[
              {
                key: 'name',
                header: 'Nom',
                render: (u) => (
                  <span className="fw-semibold">
                    {u.firstName} {u.lastName}
                  </span>
                ),
              },
              { key: 'email', header: 'Email' },
              { key: 'phone', header: 'Téléphone', render: (u) => u.phone || '—' },
              {
                key: 'role',
                header: 'Rôle',
                render: (u) => (
                  <span className={`badge bg-${ROLE_VARIANT[u.role]}`}>{staffRoleLabels[u.role]}</span>
                ),
              },
              {
                key: 'actions',
                header: '',
                className: 'text-end',
                render: (u) => (
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-pencil"
                      onClick={() => navigate(`/users/${u.id}/edit`)}
                    >
                      Modifier
                    </Button>
                    <Button variant="outline-secondary" size="sm" icon="bi-trash" onClick={() => handleDelete(u)}>
                      Supprimer
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">
                Page {page} / {totalPages}
              </span>
              <div className="btn-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default UsersPage;
