import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';

interface SuggestionItem {
  productId: string;
  productReference: string;
  productName: string;
  category: string;
  currentStock: number | null;
  stockMin: number | null;
  purchasePriceHT: string | null;
  suggestedQuantity: number | null;
}

interface SupplierGroup {
  supplierId: string | null;
  supplierName: string;
  items: SuggestionItem[];
  totalEstimatedCost: number;
}

interface SuggestionsPageProps {
  groups: SupplierGroup[];
  success?: string;
  error?: string;
  user: AdminUser;
}

const formatEur = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export const StockSuggestionsPage: FC<SuggestionsPageProps> = ({
  groups,
  success,
  error,
  user,
}) => {
  return (
    <Layout title="Suggestions de reappro" currentPath="/backoffice/stock" user={user}>
      <FlashMessages success={success} error={error} />

      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">
          <i class="bi bi-arrow-repeat me-2"></i>Suggestions de reapprovisionnement
        </h4>
        <a href="/backoffice/stock" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left me-1"></i>Retour au stock
        </a>
      </div>

      {groups.length === 0 ? (
        <div class="card">
          <div class="card-body text-center text-muted py-5">
            <i class="bi bi-check-circle fs-1 text-success"></i>
            <p class="mb-0 mt-2">Aucun reapprovisionnement necessaire</p>
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <div class="card mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                <i class="bi bi-truck me-2"></i>{group.supplierName}
                <span class="badge bg-secondary ms-2">{group.items.length} produits</span>
              </h6>
              <div class="d-flex align-items-center gap-3">
                <span class="text-muted small">
                  Estimation : <strong>{formatEur(group.totalEstimatedCost)}</strong>
                </span>
                {group.supplierId && (
                  <a
                    href={`/backoffice/supplier-orders/new?supplierId=${group.supplierId}`}
                    class="btn btn-sm btn-primary"
                  >
                    <i class="bi bi-cart-plus me-1"></i>Creer la commande
                  </a>
                )}
              </div>
            </div>
            <div class="card-body p-0">
              <table class="table table-sm mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Produit</th>
                    <th>Categorie</th>
                    <th class="text-center">Stock</th>
                    <th class="text-center">Seuil</th>
                    <th class="text-center">Quantite suggeree</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr>
                      <td>
                        <a
                          href={`/backoffice/products/${item.productId}/edit`}
                          class="text-decoration-none"
                        >
                          <div class="fw-medium">{item.productName}</div>
                          <small class="text-muted">{item.productReference}</small>
                        </a>
                      </td>
                      <td>
                        <span class="badge bg-light text-dark">{item.category}</span>
                      </td>
                      <td class="text-center">
                        <span class={`badge bg-${(item.currentStock ?? 0) === 0 ? 'danger' : 'warning'}`}>
                          {item.currentStock ?? 0}
                        </span>
                      </td>
                      <td class="text-center text-muted">{item.stockMin}</td>
                      <td class="text-center fw-bold text-primary">{item.suggestedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </Layout>
  );
};
