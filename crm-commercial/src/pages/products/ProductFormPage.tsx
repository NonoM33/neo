import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
import { productsService } from '../../services';
import type { CreateProductInput } from '../../types';

interface FormState {
  reference: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  priceHT: string;
  tvaRate: string;
  imageUrl: string;
  stock: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  reference: '',
  name: '',
  description: '',
  category: '',
  brand: '',
  priceHT: '',
  tvaRate: '20',
  imageUrl: '',
  stock: '',
  isActive: true,
};

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!isEditing || !id) return;
    productsService
      .getProduct(id)
      .then((product) => {
        setForm({
          reference: product.reference,
          name: product.name,
          description: product.description ?? '',
          category: product.category,
          brand: product.brand ?? '',
          priceHT: product.priceHT,
          tvaRate: product.tvaRate,
          imageUrl: product.imageUrl ?? '',
          stock: product.stock != null ? String(product.stock) : '',
          isActive: product.isActive,
        });
      })
      .catch((error) => {
        console.error('Failed to load product:', error);
        toast.error('Produit introuvable');
        navigate('/produits');
      })
      .finally(() => setLoading(false));
  }, [id, isEditing, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.reference.trim()) next.reference = 'La référence est requise';
    if (!form.name.trim()) next.name = 'Le nom est requis';
    if (!form.category.trim()) next.category = 'La catégorie est requise';
    const price = parseFloat(form.priceHT);
    if (!form.priceHT.trim() || Number.isNaN(price) || price <= 0) {
      next.priceHT = 'Le prix HT doit être positif';
    }
    const tva = parseFloat(form.tvaRate);
    if (form.tvaRate.trim() && (Number.isNaN(tva) || tva < 0 || tva > 100)) {
      next.tvaRate = 'TVA entre 0 et 100';
    }
    if (form.imageUrl.trim() && !/^https?:\/\//i.test(form.imageUrl.trim())) {
      next.imageUrl = "L'URL doit commencer par http(s)://";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): CreateProductInput => {
    const payload: CreateProductInput = {
      reference: form.reference.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      priceHT: parseFloat(form.priceHT),
      tvaRate: form.tvaRate.trim() ? parseFloat(form.tvaRate) : 20,
      isActive: form.isActive,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.brand.trim()) payload.brand = form.brand.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.stock.trim()) payload.stock = parseInt(form.stock, 10);
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEditing && id) {
        await productsService.updateProduct(id, buildPayload());
        toast.success('Produit mis à jour');
        navigate(`/produits/${id}`);
      } else {
        const created = await productsService.createProduct(buildPayload());
        toast.success('Produit créé');
        navigate(`/produits/${created.id}`);
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Enregistrement impossible (référence déjà utilisée ?)');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/produits')}>
            <Icon name="arrowLeft" size={15} /> Retour au catalogue
          </button>
          <h1>{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="lead-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Card head="Informations" icon="package">
              <div className="card-body">
                <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                  <div>
                    <div className="field-label">Référence *</div>
                    <input className="neo-field" name="reference" value={form.reference} onChange={handleChange} />
                    {errors.reference && <div className="field-error">{errors.reference}</div>}
                  </div>
                  <div>
                    <div className="field-label">Nom *</div>
                    <input className="neo-field" name="name" value={form.name} onChange={handleChange} />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Description</div>
                  <textarea
                    className="neo-field"
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="field-grid">
                  <div>
                    <div className="field-label">Catégorie *</div>
                    <input className="neo-field" name="category" value={form.category} onChange={handleChange} />
                    {errors.category && <div className="field-error">{errors.category}</div>}
                  </div>
                  <div>
                    <div className="field-label">Marque</div>
                    <input className="neo-field" name="brand" value={form.brand} onChange={handleChange} />
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">URL image</div>
                  <input
                    className="neo-field"
                    name="imageUrl"
                    type="url"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="https://…"
                  />
                  {errors.imageUrl && <div className="field-error">{errors.imageUrl}</div>}
                </div>
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Card head="Tarif & stock" icon="euro">
              <div className="card-body">
                <div className="field-label">Prix HT (€) *</div>
                <input
                  className="neo-field"
                  name="priceHT"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceHT}
                  onChange={handleChange}
                />
                {errors.priceHT && <div className="field-error">{errors.priceHT}</div>}
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">TVA (%)</div>
                  <input
                    className="neo-field"
                    name="tvaRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.tvaRate}
                    onChange={handleChange}
                  />
                  {errors.tvaRate && <div className="field-error">{errors.tvaRate}</div>}
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="field-label">Stock</div>
                  <input
                    className="neo-field"
                    name="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={handleChange}
                  />
                </div>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer', fontSize: 14 }}
                >
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    style={{ accentColor: 'var(--komun)', width: 16, height: 16 }}
                  />
                  Produit actif
                </label>
              </div>
            </Card>

            <Card>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Btn type="submit" icon="check" disabled={submitting}>
                  {submitting ? 'Enregistrement…' : isEditing ? 'Enregistrer' : 'Créer le produit'}
                </Btn>
                <Btn type="button" variant="subtle" onClick={() => navigate('/produits')}>
                  Annuler
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
