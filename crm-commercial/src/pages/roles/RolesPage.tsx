import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Spinner } from '../../components';
import { Btn, Card, Pill } from '../../components/neo';
import { rolesService } from '../../services/roles.service';
import type { PermissionGroup, Role, RoleInput } from '../../types/role.types';
import { RoleFormModal } from './RoleFormModal';

function apiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}

export function RolesPage() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  const load = async () => {
    setRoles(await rolesService.list());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, perms] = await Promise.all([rolesService.list(), rolesService.getPermissions()]);
        if (!cancelled) {
          setRoles(list);
          setGroups(perms);
        }
      } catch {
        if (!cancelled) toast.error('Chargement des rôles impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setModalOpen(true);
  };

  const handleSubmit = async (input: RoleInput) => {
    try {
      if (editing) {
        await rolesService.update(editing.id, input);
        toast.success('Rôle mis à jour');
      } else {
        await rolesService.create(input);
        toast.success('Rôle créé');
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      toast.error(apiError(error, 'Enregistrement du rôle impossible'));
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.isSystem) return;
    if (!window.confirm(`Supprimer le rôle « ${role.name} » ?`)) return;
    try {
      await rolesService.remove(role.id);
      toast.success('Rôle supprimé');
      await load();
    } catch (error) {
      toast.error(apiError(error, 'Suppression du rôle impossible'));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="roles-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Rôles &amp; permissions</h1>
          <p>Définissez des rôles personnalisés et les sections qu'ils peuvent gérer.</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={openCreate}>
            Nouveau rôle
          </Btn>
        </div>
      </div>

      <Card>
        {roles.length === 0 ? (
          <div className="empty">Aucun rôle défini.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Permissions</th>
                  <th style={{ textAlign: 'center' }}>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="t-main">{role.name}</td>
                    <td className="t-sub">{role.description || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Pill tone="info">{role.permissions.length}</Pill>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Pill tone={role.isSystem ? 'dark' : 'neutral'}>
                        {role.isSystem ? 'Système' : 'Personnalisé'}
                      </Pill>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEdit(role)} />
                      <Btn
                        variant="danger-ghost"
                        size="sm"
                        icon="trash"
                        disabled={role.isSystem}
                        onClick={() => handleDelete(role)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RoleFormModal
        open={modalOpen}
        role={editing}
        groups={groups}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default RolesPage;
