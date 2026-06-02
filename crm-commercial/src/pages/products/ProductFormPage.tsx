import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardHeader, CardBody, Spinner, Button, Input, Textarea } from '../../components';
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
    <div className="product-form">
      <div className="mb-4">
        <button className="btn btn-link text-secondary p-0 mb-2" onClick={() => navigate('/produits')}>
          <i className="bi bi-arrow-left me-1"></i>
          Retour au catalogue
        </button>
        <h2 className="mb-0">{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-lg-8">
            <Card className="mb-4">
              <CardHeader>Informations</CardHeader>
              <CardBody>
                <div className="row">
                  <div className="col-md-6">
                    <Input
                      label="Référence"
                      name="reference"
                      value={form.reference}
                      onChange={handleChange}
                      error={errors.reference}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <Input
                      label="Nom"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      error={errors.name}
                      required
                    />
                  </div>
                </div>
                <Textarea label="Description" name="description" value={form.description} onChange={handleChange} />
                <div className="row">
                  <div className="col-md-6">
                    <Input
                      label="Catégorie"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      error={errors.category}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <Input label="Marque" name="brand" value={form.brand} onChange={handleChange} />
                  </div>
                </div>
                <Input
                  label="URL image"
                  name="imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={handleChange}
                  error={errors.imageUrl}
                  placeholder="https://…"
                />
              </CardBody>
            </Card>
          </div>

          <div className="col-lg-4">
            <Card className="mb-4">
              <CardHeader>Tarif & stock</CardHeader>
              <CardBody>
                <Input
                  label="Prix HT (€)"
                  name="priceHT"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceHT}
                  onChange={handleChange}
                  error={errors.priceHT}
                  required
                />
                <Input
                  label="TVA (%)"
                  name="tvaRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.tvaRate}
                  onChange={handleChange}
                  error={errors.tvaRate}
                />
                <Input label="Stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />
                <div className="form-check form-switch mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="isActive">
                    Produit actif
                  </label>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="d-grid gap-2">
                  <Button type="submit" loading={submitting} icon="bi-check-lg">
                    {isEditing ? 'Enregistrer' : 'Créer le produit'}
                  </Button>
                  <Button type="button" variant="outline-secondary" onClick={() => navigate('/produits')}>
                    Annuler
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProductFormPage;
