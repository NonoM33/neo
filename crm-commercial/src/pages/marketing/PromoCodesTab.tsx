import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import { marketingService } from '../../services';
import { useUIStore } from '../../stores';
import type { PromoCode, PromoCodePayload, PromoDiscountType } from '../../types/marketing.types';
import { MarketingModal } from './MarketingModal';

interface FormState {
  code: string;
  description: string;
  discountType: PromoDiscountType;
  discountValue: string;
  minOrderHT: string;
  maxUses: string;
  perClientOnce: boolean;
  active: boolean;
  startsAt: string;
  expiresAt: string;
}

const EMPTY: FormState = {
  code: '',
  description: '',
  discountType: 'pourcentage',
  discountValue: '',
  minOrderHT: '',
  maxUses: '',
  perClientOnce: false,
  active: true,
  startsAt: '',
  expiresAt: '',
};

// ISO complet → valeur d'input datetime-local (yyyy-MM-ddThh:mm).
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromForm(form: FormState): PromoCodePayload {
  return {
    code: form.code.trim(),
    description: form.description.trim() || null,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderHT: form.minOrderHT ? Number(form.minOrderHT) : null,
    maxUses: form.maxUses ? Number(form.maxUses) : null,
    perClientOnce: form.perClientOnce,
    active: form.active,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  };
}

function formatDiscount(p: PromoCode): string {
  return p.discountType === 'pourcentage'
    ? `${Number(p.discountValue)} %`
    : `${Number(p.discountValue).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`;
}

export function PromoCodesTab() {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await marketingService.listPromoCodes());
    } catch (err) {
      console.error(err);
      addToast('error', 'Erreur lors du chargement des codes promo');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(p: PromoCode) {
    setEditing(p);
    setForm({
      code: p.code,
      description: p.description ?? '',
      discountType: p.discountType,
      discountValue: String(Number(p.discountValue)),
      minOrderHT: p.minOrderHT ? String(Number(p.minOrderHT)) : '',
      maxUses: p.maxUses != null ? String(p.maxUses) : '',
      perClientOnce: p.perClientOnce,
      active: p.active,
      startsAt: toLocalInput(p.startsAt),
      expiresAt: toLocalInput(p.expiresAt),
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.code.trim() || !form.discountValue) {
      addToast('error', 'Code et valeur de remise requis');
      return;
    }
    setSaving(true);
    try {
      const payload = fromForm(form);
      if (editing) {
        await marketingService.updatePromoCode(editing.id, payload);
        addToast('success', 'Code promo mis à jour');
      } else {
        await marketingService.createPromoCode(payload);
        addToast('success', 'Code promo créé');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
      addToast('error', "Échec de l'enregistrement (code déjà existant ?)");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: PromoCode) {
    if (!window.confirm(`Supprimer le code « ${p.code} » ?`)) return;
    try {
      await marketingService.deletePromoCode(p.id);
      addToast('success', 'Code promo supprimé');
      await load();
    } catch (err) {
      console.error(err);
      addToast('error', 'Échec de la suppression');
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn icon="plus" onClick={openCreate}>
          Nouveau code promo
        </Btn>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Code</th>
                <th>Remise</th>
                <th>Utilisations</th>
                <th>Expiration</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <Spinner />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="receipt" size={22} />
                      </span>
                      <b>Aucun code promo</b>
                      <p>Créez un premier code de réduction pour vos clients.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="t-main">{p.code}</span>
                    </td>
                    <td className="t-sub">{formatDiscount(p)}</td>
                    <td className="t-sub">
                      {p.usedCount}
                      {p.maxUses != null ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td className="t-sub">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>
                      {p.active ? (
                        <Pill tone="success" dot>
                          Actif
                        </Pill>
                      ) : (
                        <Pill tone="neutral">Inactif</Pill>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="icon-btn" aria-label="Modifier" onClick={() => openEdit(p)}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button className="icon-btn" aria-label="Supprimer" onClick={() => remove(p)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showForm && (
        <MarketingModal
          title={editing ? 'Modifier le code promo' : 'Nouveau code promo'}
          icon="receipt"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Btn variant="subtle" onClick={() => setShowForm(false)}>
                Annuler
              </Btn>
              <Btn onClick={save} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Btn>
            </>
          }
        >
          <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <div>
              <div className="field-label">Code</div>
              <input
                className="neo-field"
                style={{ textTransform: 'uppercase' }}
                value={form.code}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="NOEL10"
              />
            </div>
            <div>
              <div className="field-label">Type</div>
              <select
                className="neo-field"
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as PromoDiscountType })
                }
              >
                <option value="pourcentage">Pourcentage</option>
                <option value="montant_fixe">Montant fixe</option>
              </select>
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">
                Valeur {form.discountType === 'pourcentage' ? '(%)' : '(€)'}
              </div>
              <input
                type="number"
                className="neo-field"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Description</div>
              <input
                className="neo-field"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Montant min. commande HT (€)</div>
              <input
                type="number"
                className="neo-field"
                value={form.minOrderHT}
                onChange={(e) => setForm({ ...form, minOrderHT: e.target.value })}
                placeholder="Aucun"
              />
            </div>
            <div>
              <div className="field-label">Utilisations max</div>
              <input
                type="number"
                className="neo-field"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Illimité"
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Début</div>
              <input
                type="datetime-local"
                className="neo-field"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Expiration</div>
              <input
                type="datetime-local"
                className="neo-field"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.perClientOnce}
                onChange={(e) => setForm({ ...form, perClientOnce: e.target.checked })}
                style={{ accentColor: 'var(--komun)', width: 16, height: 16 }}
              />
              Une seule fois par client
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ accentColor: 'var(--komun)', width: 16, height: 16 }}
              />
              Actif
            </label>
          </div>
        </MarketingModal>
      )}
    </>
  );
}

export default PromoCodesTab;
