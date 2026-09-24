import { useEffect, useState } from 'react';
import { Btn, Modal } from '../../components/neo';
import type { PermissionGroup, Role, RoleInput } from '../../types/role.types';

interface RoleFormModalProps {
  open: boolean;
  role: Role | null;
  groups: PermissionGroup[];
  onClose: () => void;
  onSubmit: (input: RoleInput) => Promise<void>;
}

export function RoleFormModal({ open, role, groups, onClose, onSubmit }: RoleFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setPermissions(new Set(role?.permissions ?? []));
  }, [open, role]);

  const isSystem = role?.isSystem ?? false;

  const toggle = (key: string) =>
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: [...permissions],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={role ? `Modifier ${role.name}` : 'Nouveau rôle'}
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn variant="subtle" onClick={onClose}>
            Annuler
          </Btn>
          <Btn variant="primary" icon="check" disabled={saving || !name.trim()} onClick={submit}>
            {role ? 'Enregistrer' : 'Créer'}
          </Btn>
        </>
      }
    >
      <div className="parcours-grid2">
        <div>
          <label className="field-label">Nom du rôle</label>
          <input
            className="neo-field"
            value={name}
            maxLength={50}
            readOnly={isSystem}
            onChange={(e) => setName(e.target.value)}
          />
          {isSystem && <div className="t-sub">Le nom d'un rôle système ne peut pas être modifié.</div>}
        </div>
        <div>
          <label className="field-label">Description</label>
          <input
            className="neo-field"
            value={description}
            maxLength={255}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="roles-perms">
        {groups.map((group) => (
          <div key={group.group} className="roles-perm-group">
            <div className="roles-perm-title">{group.group}</div>
            {group.permissions.map((perm) => (
              <label key={perm.key} className="roles-perm-item">
                <input
                  type="checkbox"
                  checked={permissions.has(perm.key)}
                  onChange={() => toggle(perm.key)}
                />
                {perm.label}
              </label>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default RoleFormModal;
