import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Spinner, Button } from '../../components';
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

  return (
    <div className="products-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-0">Catalogue produits</h2>
          <span className="text-secondary small">{total} produit(s)</span>
        </div>
        {isAdmin && (
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" icon="bi-upload" onClick={() => setShowImport(true)}>
              Importer CSV
            </Button>
            <Button icon="bi-plus-lg" onClick={() => navigate('/produits/new')}>
              Nouveau produit
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-3">
        <CardBody>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Recherche</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nom, référence, description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Marque</label>
              <select className="form-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">Toutes</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Statut</label>
              <select className="form-select" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          {(search || category || brand || activeFilter) && (
            <div className="mt-3">
              <button className="btn btn-sm btn-link text-secondary p-0" onClick={resetFilters}>
                <i className="bi bi-x-circle me-1"></i>
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-4">
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-secondary p-5">
              <i className="bi bi-box-seam d-block mb-2" style={{ fontSize: '2rem' }}></i>
              Aucun produit trouvé
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Nom</th>
                    <th>Catégorie</th>
                    <th>Marque</th>
                    <th className="text-end">Prix HT</th>
                    <th className="text-end">Stock</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/produits/${product.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <code>{product.reference}</code>
                      </td>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td>{product.category}</td>
                      <td>{product.brand || '-'}</td>
                      <td className="text-end">{formatCurrency(product.priceHT)}</td>
                      <td className="text-end">{product.stock ?? '-'}</td>
                      <td>
                        {product.isActive ? (
                          <span className="badge bg-success">Actif</span>
                        ) : (
                          <span className="badge border text-body-secondary">Inactif</span>
                        )}
                      </td>
                      <td className="text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            title="Voir"
                            onClick={() => navigate(`/produits/${product.id}`)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="btn btn-outline-secondary"
                                title="Modifier"
                                onClick={() => navigate(`/produits/${product.id}/edit`)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="Supprimer"
                                onClick={() => handleDelete(product)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="text-secondary small">
            Page {page} / {totalPages}
          </span>
          <div className="btn-group">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Import CSV modal */}
      {showImport && (
        <div
          className="modal-backdrop-custom"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => !importing && setShowImport(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '480px', background: 'var(--neo-bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Importer des produits (CSV)</span>
              <button className="btn-close" disabled={importing} onClick={() => setShowImport(false)}></button>
            </div>
            <div className="card-body">
              <p className="text-secondary small">
                Séparateur <code>;</code>. Colonnes requises : <code>reference</code>, <code>name</code>,{' '}
                <code>category</code>, <code>priceHT</code>. Optionnelles : <code>description</code>, <code>brand</code>,{' '}
                <code>tvaRate</code>.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="form-control"
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
              />
              {importing && (
                <div className="d-flex align-items-center gap-2 mt-3 text-secondary">
                  <span className="spinner-border spinner-border-sm" role="status"></span>
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
