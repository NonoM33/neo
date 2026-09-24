import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card, Icon } from '../../../components/neo';
import { parcoursService } from '../../../services';
import type { Product } from '../../../types';
import type { ParcoursNeed, ParcoursRoom } from '../../../types/parcours.types';
import { fmtEUR } from '../parcours.meta';

interface EquipmentPanelProps {
  room: ParcoursRoom;
  catalog: Product[];
  loading: boolean;
  onNeedsChange: (needs: ParcoursNeed[]) => void;
}

function priceOf(catalog: Product[], productId: string): number {
  const p = catalog.find((x) => x.id === productId);
  return p ? parseFloat(p.priceHT) || 0 : 0;
}

export function EquipmentPanel({ room, catalog, loading, onNeedsChange }: EquipmentPanelProps) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const categories = useMemo(() => {
    const set = new Set(catalog.map((p) => p.category));
    return Array.from(set).sort();
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return catalog.filter((p) => {
      if (activeCat !== 'all' && p.category !== activeCat) return false;
      if (q && `${p.name} ${p.brand ?? ''} ${p.description ?? ''}`.toLowerCase().indexOf(q) < 0)
        return false;
      return true;
    });
  }, [catalog, query, activeCat]);

  const roomTotal = room.needs.reduce(
    (sum, n) => sum + priceOf(catalog, n.productId ?? '') * (n.quantity || 1),
    0
  );

  const needFor = (productId: string) => room.needs.find((n) => n.productId === productId);

  const add = async (p: Product) => {
    if (needFor(p.id)) return;
    try {
      const item = await parcoursService.addChecklistItem(room.id, {
        productId: p.id,
        category: p.category,
        label: p.name,
        quantity: 1,
        checked: true,
      });
      onNeedsChange([
        ...room.needs,
        { id: item.id, productId: p.id, category: p.category, label: p.name, quantity: 1 },
      ]);
    } catch {
      toast.error('Ajout du produit impossible');
    }
  };

  const changeQty = async (need: ParcoursNeed, delta: number) => {
    const qty = (need.quantity || 1) + delta;
    if (qty < 1) {
      try {
        await parcoursService.deleteChecklistItem(need.id);
        onNeedsChange(room.needs.filter((n) => n.id !== need.id));
      } catch {
        toast.error('Suppression impossible');
      }
      return;
    }
    try {
      await parcoursService.updateChecklistItem(need.id, { quantity: qty });
      onNeedsChange(room.needs.map((n) => (n.id === need.id ? { ...n, quantity: qty } : n)));
    } catch {
      toast.error('Mise à jour impossible');
    }
  };

  return (
    <Card>
      <div className="parcours-row" style={{ marginBottom: 12 }}>
        <Icon name="package" size={18} />
        <div className="t-main" style={{ flex: 1 }}>
          Équiper — {room.name}
        </div>
        <span className="parcours-pill">{fmtEUR(roomTotal)} HT</span>
      </div>

      {loading ? (
        <div className="t-sub" style={{ padding: 20, textAlign: 'center' }}>
          Chargement du catalogue…
        </div>
      ) : (
        <>
          <input
            className="neo-field"
            placeholder="Rechercher un produit…"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="parcours-chips" style={{ marginTop: 10 }}>
            <button
              type="button"
              className={`parcours-chip ${activeCat === 'all' ? 'on' : ''}`}
              onClick={() => setActiveCat('all')}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`parcours-chip ${activeCat === c ? 'on' : ''}`}
                onClick={() => setActiveCat(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="parcours-equip-grid">
            {filtered.length === 0 && (
              <div className="t-sub" style={{ gridColumn: '1 / -1', padding: 16, textAlign: 'center' }}>
                Aucun produit ne correspond.
              </div>
            )}
            {filtered.map((p) => {
              const need = needFor(p.id);
              return (
                <div key={p.id} className={`parcours-pcard ${need ? 'on' : ''}`}>
                  <div className="pcard-cat">
                    {p.category}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </div>
                  <div className="pcard-name">{p.name}</div>
                  <div className="pcard-price">{fmtEUR(p.priceHT)} HT</div>
                  {need ? (
                    <div className="parcours-qty">
                      <Btn variant="subtle" size="sm" onClick={() => changeQty(need, -1)}>
                        −
                      </Btn>
                      <span className="qty-n">{need.quantity}</span>
                      <Btn variant="subtle" size="sm" onClick={() => changeQty(need, 1)}>
                        +
                      </Btn>
                    </div>
                  ) : (
                    <Btn variant="subtle" size="sm" icon="check" onClick={() => add(p)}>
                      Ajouter
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
