import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Avatar, Btn, Icon } from '../../components/neo';
import { clientsService } from '../../services';
import type { Client } from '../../types';

const PAGE_SIZE = 20;

export function ClientsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await clientsService.getClients(
        { search: search.trim() || undefined },
        page,
        PAGE_SIZE
      );
      setClients(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Supprimer le client « ${client.firstName} ${client.lastName} » ?`)) return;
    try {
      await clientsService.deleteClient(client.id);
      toast.success('Client supprimé');
      loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Suppression impossible');
    }
  };

  return (
    <div className="clients-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Clients</h1>
          <p>
            {total} client{total > 1 ? 's' : ''} — votre portefeuille
          </p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/clients/new')}>
            Nouveau client
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
                <th>Ville</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}/edit`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar
                        name={`${client.firstName} ${client.lastName}`}
                        size={36}
                        tone={(['ochre', 'blue', 'green', 'ink'] as const)[i % 4]}
                      />
                      <span className="t-main">
                        {client.firstName} {client.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="t-sub">{client.email || '—'}</td>
                  <td className="t-sub">{client.phone || '—'}</td>
                  <td className="t-sub">{client.city || '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Modifier"
                        onClick={() => navigate(`/clients/${client.id}/edit`)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Supprimer"
                        onClick={() => handleDelete(client)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="users" size={22} />
                      </span>
                      <b>Aucun client</b>
                      <p>Ajustez votre recherche ou créez un nouveau client.</p>
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
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Btn>
                <Btn
                  variant="subtle"
                  size="sm"
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

export default ClientsPage;
