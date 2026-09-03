import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
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
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/produits')}>
            <Icon name="arrowLeft" size={15} /> Retour au catalogue
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>{product.name}</h1>
            {product.isActive ? (
              <Pill tone="success" dot>
                Actif
              </Pill>
            ) : (
              <Pill tone="neutral">Inactif</Pill>
            )}
          </div>
          <div className="t-mono" style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            {product.reference}
          </div>
        </div>
        {isAdmin && (
          <div className="page-actions">
            <Btn icon="edit" onClick={() => navigate(`/produits/${product.id}/edit`)}>
              Modifier
            </Btn>
          </div>
        )}
      </div>

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Détails" icon="package">
            <div className="card-body">
              <dl className="detail-dl">
                <div>
                  <dt>Catégorie</dt>
                  <dd>{product.category}</dd>
                </div>
                <div>
                  <dt>Marque</dt>
                  <dd>{product.brand || '-'}</dd>
                </div>
                <div>
                  <dt>Prix HT</dt>
                  <dd className="t-mono">{formatCurrency(product.priceHT)}</dd>
                </div>
                <div>
                  <dt>TVA</dt>
                  <dd>{product.tvaRate} %</dd>
                </div>
                <div>
                  <dt>Stock</dt>
                  <dd>{product.stock ?? '-'}</dd>
                </div>
                {product.description && (
                  <div>
                    <dt>Description</dt>
                    <dd style={{ whiteSpace: 'pre-wrap' }}>{product.description}</dd>
                  </div>
                )}
              </dl>
            </div>
          </Card>

          {/* Dépendances : ce produit a besoin de… */}
          <Card
            head="Dépendances requises"
            icon="crosshair"
            action={
              isAdmin && !showAddDep ? (
                <Btn variant="subtle" size="sm" icon="plus" onClick={() => setShowAddDep(true)}>
                  Ajouter
                </Btn>
              ) : undefined
            }
          >
            <div className="card-body">
              {showAddDep && (
                <div
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <div className="field-label">Produit requis</div>
                  {depTarget ? (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <span>
                        <strong>{depTarget.name}</strong>{' '}
                        <code className="t-mono" style={{ color: 'var(--ink-3)' }}>
                          {depTarget.reference}
                        </code>
                      </span>
                      <Btn variant="subtle" size="sm" onClick={() => setDepTarget(null)}>
                        Changer
                      </Btn>
                    </div>
                  ) : (
                    <>
                      <input
                        className="neo-field"
                        style={{ marginBottom: 8 }}
                        placeholder="Rechercher un produit…"
                        value={depSearch}
                        onChange={(e) => setDepSearch(e.target.value)}
                      />
                      {depResults.length > 0 && (
                        <div
                          style={{
                            border: '1px solid var(--line)',
                            borderRadius: 8,
                            marginBottom: 10,
                            overflow: 'hidden',
                          }}
                        >
                          {depResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setDepTarget(p)}
                              style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid var(--line)',
                                cursor: 'pointer',
                                fontSize: 14,
                              }}
                            >
                              <strong>{p.name}</strong>{' '}
                              <code className="t-mono" style={{ color: 'var(--ink-3)' }}>
                                {p.reference}
                              </code>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                    <div>
                      <div className="field-label">Type</div>
                      <select
                        className="neo-field"
                        value={depType}
                        onChange={(e) => setDepType(e.target.value as DependencyType)}
                      >
                        <option value="required">Obligatoire</option>
                        <option value="recommended">Recommandé</option>
                      </select>
                    </div>
                    <div>
                      <div className="field-label">Couverture (qté)</div>
                      <input
                        type="number"
                        min="1"
                        className="neo-field"
                        value={depCovered}
                        onChange={(e) => setDepCovered(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="field-label">Description (optionnel)</div>
                    <input
                      className="neo-field"
                      placeholder="Ex: 1 bridge pour jusqu'à 50 ampoules"
                      value={depDescription}
                      onChange={(e) => setDepDescription(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Btn disabled={savingDep || !depTarget} icon="check" onClick={handleAddDependency}>
                      Ajouter la dépendance
                    </Btn>
                    <Btn variant="subtle" onClick={resetDepForm}>
                      Annuler
                    </Btn>
                  </div>
                </div>
              )}

              {product.dependencies.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', margin: 0 }}>Aucune dépendance.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {product.dependencies.map((dep) => (
                    <li
                      key={dep.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <div>
                        <button
                          onClick={() => navigate(`/produits/${dep.requiredProduct.id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: 'var(--komun)',
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {dep.requiredProduct.name}
                        </button>{' '}
                        <code className="t-mono" style={{ color: 'var(--ink-3)' }}>
                          {dep.requiredProduct.reference}
                        </code>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Pill tone={dep.type === 'required' ? 'danger' : 'info'}>
                            {DEP_TYPE_LABELS[dep.type]}
                          </Pill>
                          <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                            {dep.coveredQuantity > 1 && <>1 pour {dep.coveredQuantity} · </>}
                            {dep.description}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <Btn
                          variant="danger-ghost"
                          size="sm"
                          icon="trash"
                          onClick={() => handleRemoveDependency(dep.id)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Dépendants : produits qui ont besoin de celui-ci */}
          <Card head="Utilisé comme dépendance par" icon="package">
            <div className="card-body">
              {product.dependents.length === 0 ? (
                <p style={{ color: 'var(--ink-3)', margin: 0 }}>Aucun produit.</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {product.dependents.map((dep) => (
                    <li
                      key={dep.id}
                      style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}
                    >
                      <button
                        onClick={() => navigate(`/produits/${dep.product.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--komun)',
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {dep.product.name}
                      </button>{' '}
                      <code className="t-mono" style={{ color: 'var(--ink-3)' }}>
                        {dep.product.reference}
                      </code>
                      <div style={{ marginTop: 4 }}>
                        <Pill tone={dep.type === 'required' ? 'danger' : 'info'}>
                          {DEP_TYPE_LABELS[dep.type]}
                        </Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
