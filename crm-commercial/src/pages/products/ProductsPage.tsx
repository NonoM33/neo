import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import { productsService } from '../../services';
import { useAuthStore } from '../../stores';
import type { Product, ProductFilter } from '../../types';

const PAGE_SIZE = 20;

export function ProductsPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('admin')) ?? false;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildFilter = useCallback((): ProductFilter => {
    const filter: ProductFilter = {};
    if (search.trim()) filter.search = search.trim();
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (activeFilter) filter.isActive = activeFilter === 'active';
    return filter;
  }, [search, category, brand, activeFilter]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsService.getProducts(buildFilter(), page, PAGE_SIZE);
      setProducts(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  }, [buildFilter, page]);

  // Debounce filter changes; reset to page 1 when filters change.
  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search, category, brand, activeFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    productsService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    productsService
      .getMarques()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  const formatCurrency = (value?: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(value));
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Supprimer le produit « ${product.name} » ?`)) return;
    try {
      await productsService.deleteProduct(product.id);
      toast.success('Produit supprimé');
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Suppression impossible (produit utilisé dans un projet ?)');
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const result = await productsService.importCSV(file);
      toast.success(result.message);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} ligne(s) en erreur`);
        console.warn('Import errors:', result.errors);
      }
      setShowImport(false);
      loadProducts();
      productsService.getCategories().then(setCategories).catch(() => {});
      productsService.getMarques().then(setBrands).catch(() => {});
    } catch (error) {
      console.error('Failed to import CSV:', error);
      toast.error('Import CSV impossible (format invalide ?)');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setBrand('');
    setActiveFilter('');
  };

  const hasFilters = Boolean(search || category || brand || activeFilter);

  return (
    <div className="products-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Catalogue produits</h1>
          <p>
            {total} produit{total > 1 ? 's' : ''} référencé{total > 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <div className="page-actions">
            <Btn variant="ghost" icon="fileText" onClick={() => setShowImport(true)}>
              Importer CSV
            </Btn>
            <Btn icon="plus" onClick={() => navigate('/produits/new')}>
              Nouveau produit
            </Btn>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <div>
            <div className="field-label">Recherche</div>
            <div className="fbar-search">
              <Icon name="search" size={16} />
              <input
                type="text"
                className="neo-field"
                placeholder="Nom, référence, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="field-label">Catégorie</div>
            <select className="neo-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="field-label">Marque</div>
            <select className="neo-field" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">Toutes</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="field-label">Statut</div>
            <select
              className="neo-field"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">Tous</option>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <div style={{ marginTop: 12 }}>
            <Btn variant="subtle" size="sm" icon="x" onClick={resetFilters}>
              Réinitialiser les filtres
            </Btn>
          </div>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Marque</th>
                <th style={{ textAlign: 'right' }}>Prix HT</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => navigate(`/produits/${product.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-mono">{product.reference}</td>
                  <td className="t-main">{product.name}</td>
                  <td className="t-sub">{product.category}</td>
                  <td className="t-sub">{product.brand || '—'}</td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {formatCurrency(product.priceHT)}
                  </td>
                  <td className="t-mono" style={{ textAlign: 'right' }}>
                    {product.stock ?? '—'}
                  </td>
                  <td>
                    <Pill tone={product.isActive ? 'success' : 'neutral'} dot>
                      {product.isActive ? 'Actif' : 'Inactif'}
                    </Pill>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Voir"
                        onClick={() => navigate(`/produits/${product.id}`)}
                      >
                        <Icon name="chevronRight" size={16} />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            className="icon-btn"
                            aria-label="Modifier"
                            onClick={() => navigate(`/produits/${product.id}/edit`)}
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label="Supprimer"
                            onClick={() => handleDelete(product)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="package" size={22} />
                      </span>
                      <b>Aucun produit trouvé</b>
                      <p>Ajustez vos filtres ou ajoutez un produit.</p>
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

      {showImport && (
        <div className="neo-modal-scrim" onClick={() => !importing && setShowImport(false)}>
          <div className="neo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neo-modal-head">
              <b>Importer des produits (CSV)</b>
              <button
                className="icon-btn"
                aria-label="Fermer"
                disabled={importing}
                onClick={() => setShowImport(false)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="neo-modal-body">
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
                Séparateur <code>;</code>. Colonnes requises : <code>reference</code>,{' '}
                <code>name</code>, <code>category</code>, <code>priceHT</code>. Optionnelles :{' '}
                <code>description</code>, <code>brand</code>, <code>tvaRate</code>.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="neo-field"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />
              {importing && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 14,
                    color: 'var(--ink-3)',
                    fontSize: 13,
                  }}
                >
                  <span className="spinner-border spinner-border-sm" role="status" />
                  Import en cours…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductsPage;
