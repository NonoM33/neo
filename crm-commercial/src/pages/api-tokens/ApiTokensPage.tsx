import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Spinner } from '../../components';
import { Btn, Card, Pill } from '../../components/neo';
import { systemTokensService } from '../../services/system-tokens.service';
import { rolesService } from '../../services/roles.service';
import type { Role } from '../../types/role.types';
import type { CreateSystemTokenInput, SystemToken } from '../../types/system-token.types';
import { ApiTokenFormModal } from './ApiTokenFormModal';

function apiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ApiTokensPage() {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<SystemToken[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadTokens = async () => {
    setTokens(await systemTokensService.list());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, roleList] = await Promise.all([
          systemTokensService.list(),
          rolesService.list(),
        ]);
        if (!cancelled) {
          setTokens(list);
          setRoles(roleList);
        }
      } catch {
        if (!cancelled) toast.error('Chargement des jetons impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async (input: CreateSystemTokenInput) => {
    const created = await systemTokensService.create(input);
    toast.success('Jeton créé');
    await loadTokens();
    return created;
  };

  const handleRevoke = async (token: SystemToken) => {
    if (token.revokedAt) return;
    if (!window.confirm(`Révoquer le jeton « ${token.name} » ?`)) return;
    try {
      await systemTokensService.revoke(token.id);
      toast.success('Jeton révoqué');
      await loadTokens();
    } catch (error) {
      toast.error(apiError(error, 'Révocation du jeton impossible'));
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="api-tokens-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Jetons API</h1>
          <p>Créez des jetons d'accès programmatique à l'API et révoquez-les à tout moment.</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => setModalOpen(true)}>
            Nouveau jeton
          </Btn>
        </div>
      </div>

      <Card>
        {tokens.length === 0 ? (
          <div className="empty">Aucun jeton API.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Préfixe</th>
                  <th>Rôles</th>
                  <th>Créé par</th>
                  <th>Dernière utilisation</th>
                  <th style={{ textAlign: 'center' }}>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td className="t-main">{token.name}</td>
                    <td>
                      <code className="token-prefix">{token.tokenPrefix}…</code>
                    </td>
                    <td className="t-sub">{token.roleNames.join(', ') || '—'}</td>
                    <td className="t-sub">{token.createdByEmail || '—'}</td>
                    <td className="t-sub">{formatDate(token.lastUsedAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Pill tone={token.revokedAt ? 'danger' : 'success'}>
                        {token.revokedAt ? 'Révoqué' : 'Actif'}
                      </Pill>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Btn
                        variant="danger-ghost"
                        size="sm"
                        icon="trash"
                        disabled={!!token.revokedAt}
                        onClick={() => handleRevoke(token)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ApiTokenFormModal
        open={modalOpen}
        roles={roles}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default ApiTokensPage;
