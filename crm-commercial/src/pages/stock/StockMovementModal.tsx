import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Icon } from '../../components/neo';
import { productsService, stockService } from '../../services';
import {
  stockMovementTypeLabels,
  type Product,
  type StockMovementType,
} from '../../types';

interface StockMovementModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function StockMovementModal({ onClose, onCreated }: StockMovementModalProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [type, setType] = useState<StockMovementType>('entree');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const response = await productsService.getProducts({ search: search.trim() }, 1, 8);
        setResults(response.data);
      } catch (error) {
        console.error('Failed to search products:', error);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search, selected]);

  const handleSubmit = async () => {
    if (!selected) {
      toast.error('Sélectionnez un produit');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty === 0) {
      toast.error('Quantité invalide');
      return;
    }
    setSubmitting(true);
    try {
      await stockService.createMovement({
        productId: selected.id,
        type,
        quantity: qty,
        reason: reason.trim() || undefined,
      });
      toast.success('Mouvement enregistré');
      onCreated();
    } catch (error) {
      console.error('Failed to create stock movement:', error);
      toast.error("Échec de l'enregistrement du mouvement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 22, 28, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 'min(520px, 100%)', padding: 24, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Nouveau mouvement de stock</h2>
          <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="field-label">Produit</div>
            {selected ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                }}
              >
                <div>
                  <div className="t-main">{selected.name}</div>
                  <div className="t-sub">
                    {selected.reference} · stock {selected.stock ?? 0}
                  </div>
                </div>
                <Btn variant="subtle" size="sm" icon="x" onClick={() => setSelected(null)}>
                  Changer
                </Btn>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  className="neo-field"
                  placeholder="Rechercher un produit (réf. ou nom)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
                {results.length > 0 && (
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      zIndex: 5,
                      maxHeight: 240,
                      overflowY: 'auto',
                      padding: 4,
                    }}
                  >
                    {results.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelected(p);
                          setSearch('');
                          setResults([]);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          background: 'none',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          font: 'inherit',
                        }}
                      >
                        <div className="t-main">{p.name}</div>
                        <div className="t-sub">
                          {p.reference} · stock {p.stock ?? 0}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="field-label">Type de mouvement</div>
            <select
              className="neo-field"
              value={type}
              onChange={(e) => setType(e.target.value as StockMovementType)}
            >
              {(Object.keys(stockMovementTypeLabels) as StockMovementType[]).map((t) => (
                <option key={t} value={t}>
                  {stockMovementTypeLabels[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="field-label">Quantité</div>
            <input
              className="neo-field"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '6px 0 0' }}>
              Le signe est ajusté automatiquement selon le type (sauf correction).
            </p>
          </div>

          <div>
            <div className="field-label">Motif (optionnel)</div>
            <input
              className="neo-field"
              placeholder="Ex. réception fournisseur, casse…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <Btn variant="subtle" onClick={onClose}>
              Annuler
            </Btn>
            <Btn icon="check" disabled={submitting || !selected} onClick={handleSubmit}>
              Enregistrer
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockMovementModal;
