import type { FC } from 'hono/jsx';
import { Layout, FlashMessages } from '../../components';
import type { AdminUser } from '../../middleware/admin-auth';
import { NEW_PROJECT_VALUE } from './quote-form.parse';
import type { QuoteFormValues, RawQuoteLine } from './quote-form.parse';

export interface QuoteFormProjectOption {
  id: string;
  name: string;
  clientName: string;
}

export interface QuoteFormProductOption {
  id: string;
  reference: string;
  name: string;
  priceHT: string;
  tvaRate: string;
}

export interface QuoteFormClient {
  id: string;
  firstName: string;
  lastName: string;
}

/** Devis en cours de modification. Absent = creation. */
export interface QuoteFormEditing {
  id: string;
  number: string;
  status: string;
  projectId: string;
  projectName: string;
}

interface QuoteFormPageProps {
  projects: QuoteFormProjectOption[];
  products: QuoteFormProductOption[];
  /** Renseigne quand on arrive depuis une fiche client : autorise la creation du projet a la volee. */
  client?: QuoteFormClient;
  preselectedProjectId?: string;
  /** Saisie a reafficher apres une erreur, pour ne rien perdre. */
  values?: QuoteFormValues;
  editing?: QuoteFormEditing;
  error?: string;
  user: AdminUser;
}

const QUOTE_STATUSES: { value: string; label: string }[] = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'envoye', label: 'Envoye' },
  { value: 'accepte', label: 'Accepte' },
  { value: 'refuse', label: 'Refuse' },
  { value: 'expire', label: 'Expire' },
];

const LINE_SCRIPT = `
(function () {
  var tbody = document.getElementById('quoteLines');
  var template = document.getElementById('quoteLineTemplate');
  if (!tbody || !template) return;

  function money(value) {
    return (Math.round(value * 100) / 100).toFixed(2) + ' EUR';
  }

  function recompute() {
    var totalHT = 0;
    var totalTVA = 0;
    var rows = tbody.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var qty = parseFloat(rows[i].querySelector('[name=lineQuantity]').value) || 0;
      var price = parseFloat(rows[i].querySelector('[name=lineUnitPriceHT]').value) || 0;
      var tva = parseFloat(rows[i].querySelector('[name=lineTvaRate]').value) || 0;
      var lineHT = qty * price;
      rows[i].querySelector('.line-total').textContent = money(lineHT);
      totalHT += lineHT;
      totalTVA += lineHT * tva / 100;
    }
    var discount = parseFloat(document.getElementById('discount').value) || 0;
    var netHT = totalHT * (1 - discount / 100);
    var netTVA = totalTVA * (1 - discount / 100);
    document.getElementById('totalHT').textContent = money(netHT);
    document.getElementById('totalTVA').textContent = money(netTVA);
    document.getElementById('totalTTC').textContent = money(netHT + netTVA);
  }

  function bindRow(row) {
    var select = row.querySelector('[name=lineProductId]');
    select.addEventListener('change', function () {
      var opt = select.options[select.selectedIndex];
      if (!opt || !opt.value) return;
      row.querySelector('[name=lineDescription]').value = opt.getAttribute('data-name') || '';
      row.querySelector('[name=lineUnitPriceHT]').value = opt.getAttribute('data-price') || '';
      row.querySelector('[name=lineTvaRate]').value = opt.getAttribute('data-tva') || '20';
      recompute();
    });
    row.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', recompute);
    });
    row.querySelector('.line-remove').addEventListener('click', function () {
      if (tbody.querySelectorAll('tr').length <= 1) return;
      row.remove();
      recompute();
    });
  }

  document.getElementById('addLine').addEventListener('click', function () {
    var row = template.content.firstElementChild.cloneNode(true);
    tbody.appendChild(row);
    bindRow(row);
    recompute();
  });

  document.getElementById('discount').addEventListener('input', recompute);
  tbody.querySelectorAll('tr').forEach(bindRow);
  recompute();

  var projectSelect = document.getElementById('projectId');
  var newProjectBlock = document.getElementById('newProjectBlock');
  if (projectSelect && newProjectBlock) {
    var toggle = function () {
      var isNew = projectSelect.value === '${NEW_PROJECT_VALUE}';
      newProjectBlock.classList.toggle('d-none', !isNew);
      document.getElementById('newProjectName').required = isNew;
    };
    projectSelect.addEventListener('change', toggle);
    toggle();
  }
})();
`;

export const QuoteFormPage: FC<QuoteFormPageProps> = ({
  projects,
  products,
  client,
  preselectedProjectId,
  values,
  editing,
  error,
  user,
}) => {
  // Sans projet existant pour ce client, on ouvre d'office la creation a la volee :
  // c'est exactement le cas d'un client tout juste cree.
  const defaultProjectId =
    values?.projectId ||
    editing?.projectId ||
    preselectedProjectId ||
    (projects.length === 0 && client ? NEW_PROJECT_VALUE : '');
  const cancelHref = editing
    ? `/backoffice/quotes/${editing.id}`
    : client
      ? `/backoffice/clients/${client.id}`
      : '/backoffice/quotes';
  const formAction = editing ? `/backoffice/quotes/${editing.id}` : '/backoffice/quotes';

  const lineRow = (line?: RawQuoteLine) => (
    <tr>
      <td>
        <select name="lineProductId" class="form-select form-select-sm">
          <option value="">-- Ligne libre --</option>
          {products.map((product) => (
            <option
              value={product.id}
              selected={line?.productId === product.id}
              data-name={product.name}
              data-price={product.priceHT}
              data-tva={product.tvaRate}
            >
              {product.reference} - {product.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input type="text" name="lineDescription" class="form-control form-control-sm" placeholder="Description" value={line?.description || ''} />
      </td>
      <td style="width: 90px;">
        <input type="number" name="lineQuantity" class="form-control form-control-sm text-end" min="1" step="1" value={line?.quantity || '1'} />
      </td>
      <td style="width: 120px;">
        <input type="number" name="lineUnitPriceHT" class="form-control form-control-sm text-end" min="0" step="0.01" placeholder="0.00" value={line?.unitPriceHT || ''} />
      </td>
      <td style="width: 90px;">
        <input type="number" name="lineTvaRate" class="form-control form-control-sm text-end" min="0" max="100" step="0.1" value={line?.tvaRate || '20'} />
      </td>
      <td class="text-end line-total align-middle" style="width: 110px;">0.00 EUR</td>
      <td style="width: 44px;">
        <button type="button" class="btn btn-sm btn-outline-danger line-remove" title="Supprimer la ligne">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  );

  const savedLines = values?.lines?.length ? values.lines : undefined;

  return (
    <Layout title="Nouveau devis" currentPath="/backoffice/quotes" user={user}>
      <div class="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h4 class="mb-1">
            <i class={`bi ${editing ? 'bi-pencil-square' : 'bi-file-earmark-plus'} me-2`}></i>
            {editing ? `Modifier le devis ${editing.number}` : 'Nouveau devis'}
          </h4>
          {client && !editing && (
            <p class="text-muted mb-0">
              Pour {client.firstName} {client.lastName}
            </p>
          )}
          {editing && <p class="text-muted mb-0">Projet {editing.projectName}</p>}
        </div>
        <a href={cancelHref} class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left me-2"></i>Retour
        </a>
      </div>

      <FlashMessages error={error} />

      <form method="post" action={formAction}>
        {client && <input type="hidden" name="clientId" value={client.id} />}

        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-folder me-2"></i>
            {editing ? 'Projet et statut' : 'Projet rattache'}
          </div>
          <div class="card-body">
            <div class="row g-3">
              {editing ? (
                <>
                  {/* Un devis ne change pas de projet : le deplacer casserait
                      la numerotation et l'historique du chantier. */}
                  <input type="hidden" name="projectId" value={editing.projectId} />
                  <div class="col-md-6">
                    <label class="form-label">Projet</label>
                    <p class="form-control-plaintext mb-0">
                      <a href={`/backoffice/projects/${editing.projectId}`} class="text-decoration-none">
                        {editing.projectName}
                      </a>
                    </p>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label" for="status">Statut</label>
                    <select id="status" name="status" class="form-select">
                      {QUOTE_STATUSES.map((status) => (
                        <option value={status.value} selected={status.value === editing.status}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
              <>
              <div class="col-md-6">
                <label class="form-label" for="projectId">
                  Projet <span class="text-danger">*</span>
                </label>
                <select id="projectId" name="projectId" class="form-select" required>
                  <option value="">-- Choisir un projet --</option>
                  {projects.map((project) => (
                    <option value={project.id} selected={project.id === defaultProjectId}>
                      {project.name}
                      {client ? '' : ` - ${project.clientName}`}
                    </option>
                  ))}
                  {client && (
                    <option value={NEW_PROJECT_VALUE} selected={defaultProjectId === NEW_PROJECT_VALUE}>
                      + Creer un nouveau projet
                    </option>
                  )}
                </select>
                {!client && (
                  <div class="form-text">
                    Un devis est toujours rattache a un projet.{' '}
                    <a href="/backoffice/projects/new">Creer un projet</a>
                  </div>
                )}
              </div>

              {client && (
                <div class="col-md-6 d-none" id="newProjectBlock">
                  <label class="form-label" for="newProjectName">
                    Nom du nouveau projet <span class="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="newProjectName"
                    name="newProjectName"
                    class="form-control"
                    value={values?.newProjectName || `Projet ${client.firstName} ${client.lastName}`}
                  />
                  <div class="form-text">Le projet sera cree en brouillon avec ce devis.</div>
                </div>
              )}
              </>
              )}
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span><i class="bi bi-list-ul me-2"></i>Lignes du devis</span>
            <button type="button" id="addLine" class="btn btn-sm btn-outline-primary">
              <i class="bi bi-plus-lg me-1"></i>Ajouter une ligne
            </button>
          </div>
          <div class="card-body p-0">
            <table class="table table-sm mb-0 align-middle">
              <thead>
                <tr>
                  <th style="width: 22%;">Produit</th>
                  <th>Description</th>
                  <th class="text-end">Qte</th>
                  <th class="text-end">PU HT</th>
                  <th class="text-end">TVA %</th>
                  <th class="text-end">Total HT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="quoteLines">{savedLines ? savedLines.map((line) => lineRow(line)) : lineRow()}</tbody>
            </table>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-lg-7">
            <div class="card">
              <div class="card-header"><i class="bi bi-sliders me-2"></i>Conditions</div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label" for="validUntil">Valide jusqu'au</label>
                    <input type="date" id="validUntil" name="validUntil" class="form-control" value={values?.validUntil || ''} />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label" for="discount">Remise (%)</label>
                    <input type="number" id="discount" name="discount" class="form-control" min="0" max="100" step="0.01" value={values?.discount || '0'} />
                  </div>
                  <div class="col-12">
                    <label class="form-label" for="notes">Notes</label>
                    <textarea id="notes" name="notes" class="form-control" rows={3}>{values?.notes || ''}</textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-5">
            <div class="card">
              <div class="card-header"><i class="bi bi-calculator me-2"></i>Totaux</div>
              <div class="card-body">
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Total HT</span>
                  <span class="fw-medium" id="totalHT">0.00 EUR</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">TVA</span>
                  <span class="fw-medium" id="totalTVA">0.00 EUR</span>
                </div>
                <hr />
                <div class="d-flex justify-content-between">
                  <span class="fw-medium">Total TTC</span>
                  <span class="fw-bold" id="totalTTC">0.00 EUR</span>
                </div>
              </div>
              <div class="card-footer d-flex gap-2">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check-lg me-2"></i>
                  {editing ? 'Enregistrer' : 'Creer le devis'}
                </button>
                <a href={cancelHref} class="btn btn-outline-secondary">
                  <i class="bi bi-x-lg me-2"></i>Annuler
                </a>
              </div>
            </div>
          </div>
        </div>
      </form>

      <template id="quoteLineTemplate">{lineRow()}</template>

      <script dangerouslySetInnerHTML={{ __html: LINE_SCRIPT }} />
    </Layout>
  );
};
