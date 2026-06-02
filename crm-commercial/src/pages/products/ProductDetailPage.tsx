import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardHeader, CardBody, Spinner, Button } from '../../components';
import { productsService } from '../../services';
import { useAuthStore } from '../../stores';
import type { Product, ProductWithDependencies, DependencyType } from '../../types';

const DEP_TYPE_LABELS: Record<DependencyType, string> = {
  required: 'Obligatoire',
  recommended: 'Recommandé',
};

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('admin')) ?? false;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductWithDependencies | null>(null);

  const [showAddDep, setShowAddDep] = useState(false);
  const [depSearch, setDepSearch] = useState('');
  const [depResults, setDepResults] = useState<Product[]>([]);
  const [depTarget, setDepTarget] = useState<Product | null>(null);
  const [depType, setDepType] = useState<DependencyType>('required');
  const [depCovered, setDepCovered] = useState('1');
  const [depDescription, setDepDescription] = useState('');
  const [savingDep, setSavingDep] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await productsService.getProduct(id);
      setProduct(data);
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error('Produit introuvable');
      navigate('/produits');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Debounced product search for the dependency picker.
  useEffect(() => {
    if (!showAddDep) return;
    const handle = setTimeout(async () => {
      try {
        const response = await productsService.getProducts(
          depSearch.trim() ? { search: depSearch.trim() } : {},
          1,
          10,
        );
        setDepResults(response.data.filter((p) => p.id !== id));
      } catch {
        setDepResults([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [depSearch, showAddDep, id]);

  const formatCurrency = (value?: string) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(value));
  };

  const resetDepForm = () => {
    setShowAddDep(false);
    setDepSearch('');
    setDepResults([]);
    setDepTarget(null);
    setDepType('required');
    setDepCovered('1');
    setDepDescription('');
  };

  const handleAddDependency = async () => {
    if (!id || !depTarget) return;
    setSavingDep(true);
    try {
      await productsService.addDependency(id, {
        requiredProductId: depTarget.id,
        type: depType,
        coveredQuantity: depCovered.trim() ? parseInt(depCovered, 10) : 1,
        description: depDescription.trim() || undefined,
      });
      toast.success('Dépendance ajoutée');
      resetDepForm();
      loadProduct();
    } catch (error) {
      console.error('Failed to add dependency:', error);
      toast.error('Ajout impossible (dépendance déjà existante ?)');
    } finally {
      setSavingDep(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!window.confirm('Supprimer cette dépendance ?')) return;
    try {
      await productsService.removeDependency(dependencyId);
      toast.success('Dépendance supprimée');
      loadProduct();
    } catch (error) {
      console.error('Failed to remove dependency:', error);
      toast.error('Suppression impossible');
    }
  };

  if (loading || !product) {
    return <Spinner />;
  }

  return (
    <div className="product-detail">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <button className="btn btn-link text-secondary p-0 mb-2" onClick={() => navigate('/produits')}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour au catalogue
          </button>
          <div className="d-flex align-items-center gap-2">
            <h2 className="mb-0">{product.name}</h2>
            {product.isActive ? (
              <span className="badge bg-success">Actif</span>
            ) : (
              <span className="badge border text-body-secondary">Inactif</span>
            )}
          </div>
          <code className="text-secondary">{product.reference}</code>
        </div>
        {isAdmin && (
          <Button icon="bi-pencil" onClick={() => navigate(`/produits/${product.id}/edit`)}>
            Modifier
          </Button>
        )}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <Card className="mb-4">
            <CardHeader>Détails</CardHeader>
            <CardBody>
              <dl className="row mb-0">
                <dt className="col-sm-3 text-secondary">Catégorie</dt>
                <dd className="col-sm-9">{product.category}</dd>
                <dt className="col-sm-3 text-secondary">Marque</dt>
                <dd className="col-sm-9">{product.brand || '-'}</dd>
                <dt className="col-sm-3 text-secondary">Prix HT</dt>
                <dd className="col-sm-9">{formatCurrency(product.priceHT)}</dd>
                <dt className="col-sm-3 text-secondary">TVA</dt>
                <dd className="col-sm-9">{product.tvaRate} %</dd>
                <dt className="col-sm-3 text-secondary">Stock</dt>
                <dd className="col-sm-9">{product.stock ?? '-'}</dd>
                {product.description && (
                  <>
                    <dt className="col-sm-3 text-secondary">Description</dt>
                    <dd className="col-sm-9" style={{ whiteSpace: 'pre-wrap' }}>
                      {product.description}
                    </dd>
                  </>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Dépendances : ce produit a besoin de… */}
          <Card className="mb-4">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>Dépendances requises</span>
                {isAdmin && !showAddDep && (
                  <button className="btn btn-sm btn-outline-primary" onClick={() => setShowAddDep(true)}>
                    <i className="bi bi-plus-lg me-1"></i>
                    Ajouter
                  </button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {showAddDep && (
                <div className="border rounded p-3 mb-3">
                  <label className="form-label">Produit requis</label>
                  {depTarget ? (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>
                        <strong>{depTarget.name}</strong> <code className="text-secondary">{depTarget.reference}</code>
                      </span>
                      <button className="btn btn-sm btn-link text-secondary" onClick={() => setDepTarget(null)}>
                        Changer
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Rechercher un produit…"
                        value={depSearch}
                        onChange={(e) => setDepSearch(e.target.value)}
                      />
                      {depResults.length > 0 && (
                        <div className="list-group mb-2">
                          {depResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="list-group-item list-group-item-action"
                              onClick={() => setDepTarget(p)}
                            >
                              <strong>{p.name}</strong> <code className="text-secondary">{p.reference}</code>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label">Type</label>
                      <select
                        className="form-select"
                        value={depType}
                        onChange={(e) => setDepType(e.target.value as DependencyType)}
                      >
                        <option value="required">Obligatoire</option>
                        <option value="recommended">Recommandé</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Couverture (qté)</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={depCovered}
                        onChange={(e) => setDepCovered(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="form-label">Description (optionnel)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: 1 bridge pour jusqu'à 50 ampoules"
                      value={depDescription}
                      onChange={(e) => setDepDescription(e.target.value)}
                    />
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    <Button loading={savingDep} disabled={!depTarget} icon="bi-check-lg" onClick={handleAddDependency}>
                      Ajouter la dépendance
                    </Button>
                    <Button variant="outline-secondary" onClick={resetDepForm}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              {product.dependencies.length === 0 ? (
                <p className="text-secondary mb-0">Aucune dépendance.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {product.dependencies.map((dep) => (
                    <li
                      key={dep.id}
                      className="list-group-item d-flex justify-content-between align-items-center px-0"
                    >
                      <div>
                        <button
                          className="btn btn-link p-0 text-start"
                          onClick={() => navigate(`/produits/${dep.requiredProduct.id}`)}
                        >
                          <strong>{dep.requiredProduct.name}</strong>
                        </button>{' '}
                        <code className="text-secondary">{dep.requiredProduct.reference}</code>
                        <div className="small text-secondary">
                          <span
                            className={`badge me-2 ${dep.type === 'required' ? 'bg-danger' : 'bg-info'}`}
                          >
                            {DEP_TYPE_LABELS[dep.type]}
                          </span>
                          {dep.coveredQuantity > 1 && <>1 pour {dep.coveredQuantity} · </>}
                          {dep.description}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          title="Supprimer"
                          onClick={() => handleRemoveDependency(dep.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="col-lg-4">
          {/* Dépendants : produits qui ont besoin de celui-ci */}
          <Card>
            <CardHeader>Utilisé comme dépendance par</CardHeader>
            <CardBody>
              {product.dependents.length === 0 ? (
                <p className="text-secondary mb-0">Aucun produit.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {product.dependents.map((dep) => (
                    <li key={dep.id} className="list-group-item px-0">
                      <button
                        className="btn btn-link p-0 text-start"
                        onClick={() => navigate(`/produits/${dep.product.id}`)}
                      >
                        <strong>{dep.product.name}</strong>
                      </button>{' '}
                      <code className="text-secondary">{dep.product.reference}</code>
                      <div>
                        <span className={`badge ${dep.type === 'required' ? 'bg-danger' : 'bg-info'}`}>
                          {DEP_TYPE_LABELS[dep.type]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
