import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
import { clientsService, devisService, productsService, projectsService } from '../../services';
import type { CreateQuoteInput } from '../../services/devis.service';
import type { Client, Product, Project } from '../../types';

/** Valeur du <option> « créer un nouveau projet » dans le sélecteur. */
const NEW_PROJECT = '__new__';

interface LineState {
  key: number;
  productId: string;
  description: string;
  quantity: string;
  unitPriceHT: string;
  tvaRate: string;
}

const emptyLine = (key: number): LineState => ({
  key,
  productId: '',
  description: '',
  quantity: '1',
  unitPriceHT: '',
  tvaRate: '20',
});

const money = (value: number) => `${(Math.round(value * 100) / 100).toFixed(2)} €`;

/** L'API plafonne `limit` a 100 : au-dela elle repond 400. On pagine donc. */
const PAGE_SIZE = 100;

async function loadAllProjects(clientId: string): Promise<Project[]> {
  const filter = clientId ? { clientId } : undefined;
  const first = await projectsService.getProjects(filter, 1, PAGE_SIZE);
  const pages = first.meta?.totalPages ?? 1;
  if (pages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => projectsService.getProjects(filter, i + 2, PAGE_SIZE))
  );
  return [first, ...rest].flatMap((r) => r.data);
}

async function loadAllProducts(): Promise<Product[]> {
  const first = await productsService.getProducts(undefined, 1, PAGE_SIZE);
  const pages = first.pagination?.totalPages ?? 1;
  if (pages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => productsService.getProducts(undefined, i + 2, PAGE_SIZE))
  );
  return [first, ...rest].flatMap((r) => r.data);
}

export function DevisFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId') ?? '';
  const preselectedProjectId = searchParams.get('projectId') ?? '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineState[]>([emptyLine(0)]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      loadAllProjects(clientId),
      loadAllProducts(),
      clientId ? clientsService.getClient(clientId) : Promise.resolve(null),
    ])
      .then(([allProjects, allProducts, clientResult]) => {
        if (cancelled) return;
        setProjects(allProjects);
        setProducts(allProducts);
        setClient(clientResult);

        // Un client sans aucun projet — celui qu'on vient de créer — doit
        // quand même pouvoir recevoir un devis : on ouvre la création à la volée.
        if (preselectedProjectId) {
          setProjectId(preselectedProjectId);
        } else if (clientResult && allProjects.length === 0) {
          setProjectId(NEW_PROJECT);
        }
        if (clientResult) {
          setNewProjectName(`Projet ${clientResult.firstName} ${clientResult.lastName}`);
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Chargement impossible');
        navigate('/devis');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, preselectedProjectId, navigate]);

  const updateLine = (key: number, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const pickProduct = (key: number, id: string) => {
    const product = products.find((p) => p.id === id);
    updateLine(key, {
      productId: id,
      ...(product
        ? {
            description: product.name,
            unitPriceHT: product.priceHT,
            tvaRate: product.tvaRate ?? '20',
          }
        : {}),
    });
  };

  const totals = useMemo(() => {
    let totalHT = 0;
    let totalTVA = 0;
    for (const line of lines) {
      const lineHT = (Number(line.quantity) || 0) * (Number(line.unitPriceHT) || 0);
      totalHT += lineHT;
      totalTVA += (lineHT * (Number(line.tvaRate) || 0)) / 100;
    }
    const factor = 1 - (Number(discount) || 0) / 100;
    return { ht: totalHT * factor, tva: totalTVA * factor, ttc: (totalHT + totalTVA) * factor };
  }, [lines, discount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filled = lines.filter((line) => line.description.trim() || line.unitPriceHT.trim());
    if (filled.length === 0) {
      toast.error('Ajoutez au moins une ligne au devis');
      return;
    }
    if (projectId === NEW_PROJECT && !newProjectName.trim()) {
      toast.error('Nom du nouveau projet requis');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateQuoteInput = {
        discount: Number(discount) || 0,
        ...(validUntil ? { validUntil } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        lines: filled.map((line) => ({
          ...(line.productId ? { productId: line.productId } : {}),
          description: line.description.trim(),
          quantity: Number(line.quantity) || 1,
          unitPriceHT: Number(line.unitPriceHT) || 0,
          tvaRate: Number(line.tvaRate) || 20,
        })),
      };

      // Le projet n'est créé qu'une fois le devis prêt : un devis refusé ne
      // doit pas laisser un projet vide derrière lui.
      let targetProjectId = projectId;
      if (projectId === NEW_PROJECT) {
        const project = await projectsService.createProject({
          clientId,
          name: newProjectName.trim(),
          status: 'brouillon',
        });
        targetProjectId = project.id;
      }

      const quote = await devisService.createQuote(targetProjectId, payload);
      toast.success('Devis créé');
      navigate(`/devis/${quote.id}`);
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error("Échec de la création du devis");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  const backHref = client ? `/clients/${client.id}` : '/devis';

  return (
    <div style={{ padding: 28, maxWidth: 1040, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate(backHref)}>
            <Icon name="arrowLeft" size={15} /> {client ? 'Retour au client' : 'Retour aux devis'}
          </button>
          <h1>Nouveau devis</h1>
          {client && (
            <p className="t-sub">
              Pour {client.firstName} {client.lastName}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card head="Projet rattaché" icon="folder">
          <div className="card-body">
            <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <div>
                <div className="field-label">Projet *</div>
                <select
                  className="neo-field"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="" disabled>
                    Sélectionner un projet…
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {client ? '' : ` — ${project.client.firstName} ${project.client.lastName}`}
                    </option>
                  ))}
                  {client && <option value={NEW_PROJECT}>+ Créer un nouveau projet</option>}
                </select>
                {!client && (
                  <div className="t-sub" style={{ marginTop: 6 }}>
                    Un devis est toujours rattaché à un projet.
                  </div>
                )}
              </div>
              {projectId === NEW_PROJECT && (
                <div>
                  <div className="field-label">Nom du nouveau projet *</div>
                  <input
                    className="neo-field"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  <div className="t-sub" style={{ marginTop: 6 }}>
                    Le projet sera créé en brouillon avec ce devis.
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card
          head="Lignes du devis"
          icon="fileText"
          flush
          action={
            <Btn
              type="button"
              variant="ghost"
              size="sm"
              icon="plus"
              onClick={() => setLines((prev) => [...prev, emptyLine(Date.now())])}
            >
              Ajouter une ligne
            </Btn>
          }
        >
          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Produit</th>
                  <th>Description</th>
                  <th style={{ width: 80 }}>Qté</th>
                  <th style={{ width: 110 }}>PU HT</th>
                  <th style={{ width: 90 }}>TVA %</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Total HT</th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key}>
                    <td>
                      <select
                        className="neo-field"
                        value={line.productId}
                        onChange={(e) => pickProduct(line.key, e.target.value)}
                      >
                        <option value="">— Ligne libre —</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.reference} — {product.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="neo-field"
                        placeholder="Description"
                        value={line.description}
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="neo-field"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="neo-field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={line.unitPriceHT}
                        onChange={(e) => updateLine(line.key, { unitPriceHT: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="neo-field"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.tvaRate}
                        onChange={(e) => updateLine(line.key, { tvaRate: e.target.value })}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {money((Number(line.quantity) || 0) * (Number(line.unitPriceHT) || 0))}
                    </td>
                    <td>
                      <Btn
                        type="button"
                        variant="danger-ghost"
                        size="sm"
                        icon="trash"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length <= 1 ? prev : prev.filter((l) => l.key !== line.key)
                          )
                        }
                        title="Supprimer la ligne"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <Card head="Conditions" icon="settings">
            <div className="card-body">
              <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                <div>
                  <div className="field-label">Valide jusqu'au</div>
                  <input
                    className="neo-field"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
                <div>
                  <div className="field-label">Remise (%)</div>
                  <input
                    className="neo-field"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="field-label">Notes</div>
                <textarea
                  className="neo-field"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card head="Totaux" icon="chart">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Total HT</dt>
                  <dd className="t-mono">{money(totals.ht)}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>TVA</dt>
                  <dd className="t-mono">{money(totals.tva)}</dd>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--line)',
                    marginTop: 8,
                    paddingTop: 8,
                  }}
                >
                  <dt>Total TTC</dt>
                  <dd className="t-mono">
                    <strong>{money(totals.ttc)}</strong>
                  </dd>
                </div>
              </dl>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Btn type="submit" icon="check" disabled={saving}>
                  {saving ? 'Création…' : 'Créer le devis'}
                </Btn>
                <Btn type="button" variant="ghost" onClick={() => navigate(backHref)}>
                  Annuler
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}

export default DevisFormPage;
