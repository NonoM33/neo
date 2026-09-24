import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Modal, Pill } from '../../components/neo';
import type { Role } from '../../types/role.types';
import type { CreateSystemTokenInput, CreatedSystemToken } from '../../types/system-token.types';

interface ApiTokenFormModalProps {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onSubmit: (input: CreateSystemTokenInput) => Promise<CreatedSystemToken>;
}

export function ApiTokenFormModal({ open, roles, onClose, onSubmit }: ApiTokenFormModalProps) {
  const [name, setName] = useState('');
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setRoleIds(new Set());
    setSaving(false);
    setSecret(null);
  }, [open]);

  const toggle = (id: string) =>
    setRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (!name.trim() || roleIds.size === 0) return;
    setSaving(true);
    try {
      const created = await onSubmit({ name: name.trim(), roleIds: [...roleIds] });
      setSecret(created.raw);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      toast.success('Jeton copié dans le presse-papiers');
    } catch {
      toast.error('Copie impossible');
    }
  };

  if (secret) {
    return (
      <Modal
        open={open}
        title="Jeton créé"
        onClose={onClose}
        width={560}
        footer={
          <Btn variant="primary" icon="check" onClick={onClose}>
            J'ai copié le jeton
          </Btn>
        }
      >
        <div className="token-reveal">
          <p className="token-reveal-warn">
            Copiez ce jeton maintenant : il ne sera plus jamais affiché.
          </p>
          <code className="token-secret">{secret}</code>
          <Btn variant="subtle" size="sm" onClick={copy}>
            Copier le jeton
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      title="Nouveau jeton API"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn variant="subtle" onClick={onClose}>
            Annuler
          </Btn>
          <Btn
            variant="primary"
            icon="check"
            disabled={saving || !name.trim() || roleIds.size === 0}
            onClick={submit}
          >
            Créer le jeton
          </Btn>
        </>
      }
    >
      <div>
        <label className="field-label">Nom du jeton</label>
        <input
          className="neo-field"
          value={name}
          maxLength={120}
          placeholder="Ex. Intégration CI"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label className="field-label">Rôles accordés</label>
        {roles.length === 0 ? (
          <div className="t-sub">Aucun rôle disponible.</div>
        ) : (
          <div className="token-roles">
            {roles.map((role) => (
              <label key={role.id} className="token-role-item">
                <input
                  type="checkbox"
                  checked={roleIds.has(role.id)}
                  onChange={() => toggle(role.id)}
                />
                <span>{role.name}</span>
                {role.isSystem && <Pill tone="dark">Système</Pill>}
              </label>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ApiTokenFormModal;
