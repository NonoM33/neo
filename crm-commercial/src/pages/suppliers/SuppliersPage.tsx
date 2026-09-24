import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Icon, Pill } from '../../components/neo';
import { suppliersService } from '../../services';
import type {
  Supplier,
  SupplierInput,
  SupplierListItem,
} from '../../types/supplier.types';
import { SupplierFormModal } from './SupplierFormModal';

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function SuppliersPage() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const load = async (term?: string) => {
    const list = await suppliersService.list(term);
    setSuppliers(list);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await suppliersService.list();
        if (!cancelled) setSuppliers(list);
      } catch (error) {
        console.error('Failed to load suppliers:', error);
        toast.error('Impossible de charger les fournisseurs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await load(search.trim() || undefined);
    } catch {
      toast.error('Recherche impossible');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const { supplier } = await suppliersService.get(id);
      setEditing(supplier);
      setModalOpen(true);
    } catch {
      toast.error('Fournisseur introuvable');
    }
  };

  const handleSubmit = async (input: SupplierInput) => {
    try {
      if (editing) {
        await suppliersService.update(editing.id, input);
        toast.success('Fournisseur mis à jour');
      } else {
        await suppliersService.create(input);
        toast.success('Fournisseur créé');
      }
      setModalOpen(false);
      await load(search.trim() || undefined);
    } catch {
      toast.error("Échec de l'enregistrement");
    }
  };

  const handleDelete = async (s: SupplierListItem) => {
    if (!window.confirm(`Supprimer le fournisseur ${s.name} ?`)) return;
    try {
      await suppliersService.remove(s.id);
      await load(search.trim() || undefined);
      toast.success('Fournisseur supprimé');
    } catch {
      toast.error('Échec de la suppression (produits liés ?)');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="suppliers-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Fournisseurs</h1>
          <p>Gérez vos fournisseurs et leurs conditions commerciales.</p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={openCreate}>
            Nouveau fournisseur
          </Btn>
        </div>
      </div>

      <div className="fbar mb-22">
        <form className="fbar-search" onSubmit={handleSearch}>
          <Icon name="search" size={16} />
          <input
            placeholder="Nom, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Btn variant="subtle" onClick={handleSearch}>
          Filtrer
        </Btn>
        {search && (
          <Btn
            variant="ghost"
            icon="x"
            onClick={async () => {
              setSearch('');
              await load();
            }}
          />
        )}
      </div>

      <Card>
        {suppliers.length === 0 ? (
          <div className="empty">Aucun fournisseur trouvé.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Site web</th>
                  <th>Ville</th>
                  <th style={{ textAlign: 'center' }}>Produits</th>
                  <th style={{ textAlign: 'center' }}>Actif</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="t-main">{s.name}</td>
                    <td className="t-sub">
                      {s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : '—'}
                    </td>
                    <td className="t-sub">{s.phone || '—'}</td>
                    <td className="t-sub">
                      {s.website ? (
                        <a href={s.website} target="_blank" rel="noopener noreferrer">
                          {hostname(s.website)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="t-sub">{s.city || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Pill tone="info">{s.productCount}</Pill>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Pill tone={s.isActive ? 'success' : 'neutral'}>
                        {s.isActive ? 'Oui' : 'Non'}
                      </Pill>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Btn variant="ghost" size="sm" icon="edit" onClick={() => openEdit(s.id)} />
                      <Btn
                        variant="danger-ghost"
                        size="sm"
                        icon="trash"
                        onClick={() => handleDelete(s)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SupplierFormModal
        open={modalOpen}
        supplier={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default SuppliersPage;
