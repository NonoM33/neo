import { useEffect, useState, useCallback } from 'react';
import { Button, Table } from '../../components';
import { marketingService } from '../../services';
import { useUIStore } from '../../stores';
import type { Popup, PopupPayload, PopupFrequency, PromoCode } from '../../types/marketing.types';
import { MarketingModal } from './MarketingModal';

interface FormState {
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  promoCodeId: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  delaySeconds: string;
  frequency: PopupFrequency;
  priority: string;
}

const EMPTY: FormState = {
  title: '',
  body: '',
  imageUrl: '',
  ctaLabel: '',
  ctaUrl: '',
  promoCodeId: '',
  active: true,
  startsAt: '',
  endsAt: '',
  delaySeconds: '3',
  frequency: 'une_fois_session',
  priority: '0',
};

const FREQUENCY_LABEL: Record<PopupFrequency, string> = {
  toujours: 'À chaque visite',
  une_fois_session: 'Une fois par session',
  une_fois_jour: 'Une fois par jour',
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromForm(form: FormState): PopupPayload {
  return {
    title: form.title.trim(),
    body: form.body.trim(),
    imageUrl: form.imageUrl.trim() || null,
    ctaLabel: form.ctaLabel.trim() || null,
    ctaUrl: form.ctaUrl.trim() || null,
    promoCodeId: form.promoCodeId || null,
    active: form.active,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    delaySeconds: Number(form.delaySeconds) || 0,
    frequency: form.frequency,
    priority: Number(form.priority) || 0,
  };
}

export function PopupsTab() {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<Popup[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [popups, promos] = await Promise.all([
        marketingService.listPopups(),
        marketingService.listPromoCodes(),
      ]);
      setItems(popups);
      setPromoCodes(promos);
    } catch (err) {
      console.error(err);
      addToast('error', 'Erreur lors du chargement des pop-ups');
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

  function openEdit(p: Popup) {
    setEditing(p);
    setForm({
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl ?? '',
      ctaLabel: p.ctaLabel ?? '',
      ctaUrl: p.ctaUrl ?? '',
      promoCodeId: p.promoCodeId ?? '',
      active: p.active,
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
      delaySeconds: String(p.delaySeconds),
      frequency: p.frequency,
      priority: String(p.priority),
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      addToast('error', 'Titre et contenu requis');
      return;
    }
    setSaving(true);
    try {
      const payload = fromForm(form);
      if (editing) {
        await marketingService.updatePopup(editing.id, payload);
        addToast('success', 'Pop-up mise à jour');
      } else {
        await marketingService.createPopup(payload);
        addToast('success', 'Pop-up créée');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
      addToast('error', "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Popup) {
    if (!window.confirm(`Supprimer la pop-up « ${p.title} » ?`)) return;
    try {
      await marketingService.deletePopup(p.id);
      addToast('success', 'Pop-up supprimée');
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
          Nouvelle pop-up
        </Button>
      </div>

      <Table
        data={items}
        loading={loading}
        keyExtractor={(p) => p.id}
        emptyMessage="Aucune pop-up"
        columns={[
          {
            key: 'title',
            header: 'Titre',
            render: (p) => <span className="fw-semibold">{p.title}</span>,
          },
          {
            key: 'frequency',
            header: 'Fréquence',
            render: (p) => FREQUENCY_LABEL[p.frequency],
          },
          { key: 'delay', header: 'Délai', render: (p) => `${p.delaySeconds}s` },
          {
            key: 'active',
            header: 'Statut',
            render: (p) =>
              p.active ? (
                <span className="badge" style={{ background: 'var(--neo-status-gagne)' }}>
                  Active
                </span>
              ) : (
                <span className="badge border text-body-secondary">Inactive</span>
              ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (p) => (
              <div className="d-flex gap-2 justify-content-end">
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
          title={editing ? 'Modifier la pop-up' : 'Nouvelle pop-up'}
          icon="bi-window-stack"
          size="lg"
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
            <div className="col-12">
              <label className="form-label">Titre</label>
              <input
                className="form-control"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Contenu (HTML autorisé)</label>
              <textarea
                className="form-control"
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Image (URL)</label>
              <input
                className="form-control"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Code promo mis en avant</label>
              <select
                className="form-select"
                value={form.promoCodeId}
                onChange={(e) => setForm({ ...form, promoCodeId: e.target.value })}
              >
                <option value="">Aucun</option>
                {promoCodes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Libellé du bouton (CTA)</label>
              <input
                className="form-control"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="J'en profite"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Lien du bouton (CTA)</label>
              <input
                className="form-control"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Délai (s)</label>
              <input
                type="number"
                className="form-control"
                value={form.delaySeconds}
                onChange={(e) => setForm({ ...form, delaySeconds: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Fréquence</label>
              <select
                className="form-select"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as PopupFrequency })}
              >
                {(Object.keys(FREQUENCY_LABEL) as PopupFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Priorité</label>
              <input
                type="number"
                className="form-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
              <label className="form-label">Fin</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="popup-active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="popup-active">
                  Active
                </label>
              </div>
            </div>
          </div>
        </MarketingModal>
      )}
    </>
  );
}

export default PopupsTab;
