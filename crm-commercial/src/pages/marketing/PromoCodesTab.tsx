import { useEffect, useState, useCallback } from 'react';
import { Button, Table } from '../../components';
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
      <div className="d-flex justify-content-end mb-3">
        <Button icon="bi-plus-lg" onClick={openCreate}>
          Nouveau code promo
        </Button>
      </div>

      <Table
        data={items}
        loading={loading}
        keyExtractor={(p) => p.id}
        emptyMessage="Aucun code promo"
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (p) => <span className="fw-semibold">{p.code}</span>,
          },
          { key: 'discount', header: 'Remise', render: formatDiscount },
          {
            key: 'uses',
            header: 'Utilisations',
            render: (p) => `${p.usedCount}${p.maxUses != null ? ` / ${p.maxUses}` : ''}`,
          },
          {
            key: 'expiresAt',
            header: 'Expiration',
            render: (p) =>
              p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('fr-FR') : '—',
          },
          {
            key: 'active',
            header: 'Statut',
            render: (p) =>
              p.active ? (
                <span className="badge" style={{ background: 'var(--neo-status-gagne)' }}>
                  Actif
                </span>
              ) : (
                <span className="badge border text-body-secondary">Inactif</span>
              ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (p) => (
              <div className="d-flex gap-2 justify-content-end" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline-secondary" icon="bi-pencil" onClick={() => openEdit(p)}>
                  {''}
                </Button>
                <Button size="sm" variant="danger" icon="bi-trash" onClick={() => remove(p)}>
                  {''}
                </Button>
              </div>
            ),
          },
        ]}
      />

      {showForm && (
        <MarketingModal
          title={editing ? 'Modifier le code promo' : 'Nouveau code promo'}
          icon="bi-ticket-perforated"
          onClose={() => setShowForm(false)}
          footer={
            <>
              <Button variant="outline-secondary" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button onClick={save} loading={saving}>
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Code</label>
              <input
                className="form-control text-uppercase"
                value={form.code}
                disabled={!!editing}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="NOEL10"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={form.discountType}
                onChange={(e) =>
                  setForm({ ...form, discountType: e.target.value as PromoDiscountType })
                }
              >
                <option value="pourcentage">Pourcentage</option>
                <option value="montant_fixe">Montant fixe</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">
                Valeur {form.discountType === 'pourcentage' ? '(%)' : '(€)'}
              </label>
              <input
                type="number"
                className="form-control"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <input
                className="form-control"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Montant min. commande HT (€)</label>
              <input
                type="number"
                className="form-control"
                value={form.minOrderHT}
                onChange={(e) => setForm({ ...form, minOrderHT: e.target.value })}
                placeholder="Aucun"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Utilisations max</label>
              <input
                type="number"
                className="form-control"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Illimité"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Début</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Expiration</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="promo-perclient"
                  checked={form.perClientOnce}
                  onChange={(e) => setForm({ ...form, perClientOnce: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="promo-perclient">
                  Une seule fois par client
                </label>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="promo-active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="promo-active">
                  Actif
                </label>
              </div>
            </div>
          </div>
        </MarketingModal>
      )}
    </>
  );
}

export default PromoCodesTab;
