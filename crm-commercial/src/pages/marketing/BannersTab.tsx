import { useEffect, useState, useCallback } from 'react';
import { Button, Table } from '../../components';
import { marketingService } from '../../services';
import { useUIStore } from '../../stores';
import type { Banner, BannerPayload } from '../../types/marketing.types';
import { MarketingModal } from './MarketingModal';

interface FormState {
  message: string;
  linkUrl: string;
  linkLabel: string;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  active: boolean;
  startsAt: string;
  endsAt: string;
  priority: string;
}

const EMPTY: FormState = {
  message: '',
  linkUrl: '',
  linkLabel: '',
  bgColor: '#0d6efd',
  textColor: '#ffffff',
  dismissible: true,
  active: true,
  startsAt: '',
  endsAt: '',
  priority: '0',
};

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromForm(form: FormState): BannerPayload {
  return {
    message: form.message.trim(),
    linkUrl: form.linkUrl.trim() || null,
    linkLabel: form.linkLabel.trim() || null,
    bgColor: form.bgColor,
    textColor: form.textColor,
    dismissible: form.dismissible,
    active: form.active,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    priority: Number(form.priority) || 0,
  };
}

export function BannersTab() {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await marketingService.listBanners());
    } catch (err) {
      console.error(err);
      addToast('error', 'Erreur lors du chargement des bannières');
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

  function openEdit(b: Banner) {
    setEditing(b);
    setForm({
      message: b.message,
      linkUrl: b.linkUrl ?? '',
      linkLabel: b.linkLabel ?? '',
      bgColor: b.bgColor,
      textColor: b.textColor,
      dismissible: b.dismissible,
      active: b.active,
      startsAt: toLocalInput(b.startsAt),
      endsAt: toLocalInput(b.endsAt),
      priority: String(b.priority),
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.message.trim()) {
      addToast('error', 'Message requis');
      return;
    }
    setSaving(true);
    try {
      const payload = fromForm(form);
      if (editing) {
        await marketingService.updateBanner(editing.id, payload);
        addToast('success', 'Bannière mise à jour');
      } else {
        await marketingService.createBanner(payload);
        addToast('success', 'Bannière créée');
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

  async function remove(b: Banner) {
    if (!window.confirm('Supprimer cette bannière ?')) return;
    try {
      await marketingService.deleteBanner(b.id);
      addToast('success', 'Bannière supprimée');
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
          Nouvelle bannière
        </Button>
      </div>

      <Table
        data={items}
        loading={loading}
        keyExtractor={(b) => b.id}
        emptyMessage="Aucune bannière"
        columns={[
          {
            key: 'message',
            header: 'Aperçu',
            render: (b) => (
              <span
                className="badge"
                style={{ background: b.bgColor, color: b.textColor, maxWidth: 340 }}
              >
                {b.message}
              </span>
            ),
          },
          { key: 'priority', header: 'Priorité', render: (b) => b.priority },
          {
            key: 'active',
            header: 'Statut',
            render: (b) =>
              b.active ? (
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
            render: (b) => (
              <div className="d-flex gap-2 justify-content-end">
                <Button size="sm" variant="outline-secondary" icon="bi-pencil" onClick={() => openEdit(b)}>
                  {''}
                </Button>
                <Button size="sm" variant="danger" icon="bi-trash" onClick={() => remove(b)}>
                  {''}
                </Button>
              </div>
            ),
          },
        ]}
      />

      {showForm && (
        <MarketingModal
          title={editing ? 'Modifier la bannière' : 'Nouvelle bannière'}
          icon="bi-megaphone"
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
          <div
            className="text-center mb-3 p-2"
            style={{ background: form.bgColor, color: form.textColor, borderRadius: 6 }}
          >
            {form.message || 'Aperçu de la bannière'}
            {form.linkLabel && <strong className="ms-2 text-decoration-underline">{form.linkLabel}</strong>}
          </div>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Message</label>
              <input
                className="form-control"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="-10 % sur votre première installation !"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Lien (URL)</label>
              <input
                className="form-control"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Libellé du lien</label>
              <input
                className="form-control"
                value={form.linkLabel}
                onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                placeholder="J'en profite"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Fond</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={form.bgColor}
                onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Texte</label>
              <input
                type="color"
                className="form-control form-control-color w-100"
                value={form.textColor}
                onChange={(e) => setForm({ ...form, textColor: e.target.value })}
              />
            </div>
            <div className="col-md-6">
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
            <div className="col-md-6">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="banner-dismissible"
                  checked={form.dismissible}
                  onChange={(e) => setForm({ ...form, dismissible: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="banner-dismissible">
                  Fermable par le visiteur
                </label>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="banner-active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="banner-active">
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

export default BannersTab;
