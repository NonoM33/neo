import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Avatar, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { staffRoleLabels, type StaffRole, type StaffUser } from '../../types';
import { usersService } from '../../services';

const PAGE_SIZE = 20;

const ROLE_TONE: Record<StaffRole, PillTone> = {
  admin: 'danger',
  integrateur: 'info',
  auditeur: 'neutral',
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
    <div className="users-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Utilisateurs</h1>
          <p>
            {total} compte{total > 1 ? 's' : ''} staff
          </p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/users/new')}>
            Nouvel utilisateur
          </Btn>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div className="fbar-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="neo-field"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
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

      {loading ? (
        <Spinner />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/users/${u.id}/edit`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar
                        name={`${u.firstName} ${u.lastName}`}
                        size={34}
                        tone={(['ochre', 'blue', 'green', 'ink'] as const)[i % 4]}
                      />
                      <span className="t-main">
                        {u.firstName} {u.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="t-sub">{u.email}</td>
                  <td className="t-sub">{u.phone || '—'}</td>
                  <td>
                    <Pill tone={ROLE_TONE[u.role]} dot>
                      {staffRoleLabels[u.role]}
                    </Pill>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Modifier"
                        onClick={() => navigate(`/users/${u.id}/edit`)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="icon-btn" aria-label="Supprimer" onClick={() => handleDelete(u)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="users" size={22} />
                      </span>
                      <b>Aucun utilisateur</b>
                      <p>Ajustez vos filtres ou créez un compte staff.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Page {page} / {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn
                  variant="subtle"
                  size="sm"
                  icon="arrowLeft"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Btn>
                <Btn
                  variant="subtle"
                  size="sm"
                  iconRight="arrowRight"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UsersPage;
