import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface ProductOption {
  id: string;
  reference: string;
  name: string;
  stock: number | null;
}

interface CorrectionPageProps {
  products: ProductOption[];
  success?: string;
  error?: string;
  user: AdminUser;
}

export const StockCorrectionPage: FC<CorrectionPageProps> = ({
  products,
  success,
  error,
  user,
}) => {
  return (
    <Layout title="Correction de stock" currentPath="/backoffice/stock" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">
          <i class="bi bi-pencil-square me-2"></i>Correction manuelle de stock
        </h4>
        <a href="/backoffice/stock" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>Retour au stock
        </a>
      </div>

      <div class="card">
        <div class="card-body">
          {products.length === 0 ? (
            <div class="text-center text-muted py-4">
              <i class="bi bi-box display-6 d-block mb-2"></i>
              <p class="mb-0">Aucun produit avec gestion de stock</p>
            </div>
          ) : (
            <form method="post" action="/backoffice/stock/correction" class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Produit</label>
                <select name="productId" class="form-select" required>
                  <option value="">-- Selectionner un produit --</option>
                  {products.map((p) => (
                    <option value={p.id}>
                      {p.name} ({p.reference}) — stock actuel : {p.stock ?? 0}
                    </option>
                  ))}
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label">Nouveau stock</label>
                <input type="number" name="newStock" class="form-control" min="0" required />
                <small class="text-muted">La correction sera calculee a partir du stock actuel.</small>
              </div>
              <div class="col-md-3">
                <label class="form-label">Motif</label>
                <input type="text" name="reason" class="form-control" placeholder="ex: inventaire" required />
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-check-lg me-1"></i>Appliquer la correction
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};
