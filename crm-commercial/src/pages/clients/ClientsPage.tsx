import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Table, Button } from '../../components';
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
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="text-secondary mb-0">
            {total} client{total > 1 ? 's' : ''}
          </p>
        </div>
        <Button icon="bi-plus-lg" onClick={() => navigate('/clients/new')}>
          Nouveau client
        </Button>
      </div>

      <Card className="mb-4">
        <CardBody>
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
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Table<Client>
            loading={loading}
            data={clients}
            keyExtractor={(c) => c.id}
            emptyMessage="Aucun client"
            columns={[
              {
                key: 'name',
                header: 'Nom',
                render: (c) => (
                  <span className="fw-semibold">
                    {c.firstName} {c.lastName}
                  </span>
                ),
              },
              { key: 'email', header: 'Email', render: (c) => c.email || '—' },
              { key: 'phone', header: 'Téléphone', render: (c) => c.phone || '—' },
              { key: 'city', header: 'Ville', render: (c) => c.city || '—' },
              {
                key: 'actions',
                header: '',
                className: 'text-end',
                render: (c) => (
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-pencil"
                      onClick={() => navigate(`/clients/${c.id}/edit`)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-trash"
                      onClick={() => handleDelete(c)}
                    >
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

export default ClientsPage;
