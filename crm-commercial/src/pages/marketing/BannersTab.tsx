import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn icon="plus" onClick={openCreate}>
          Nouvelle bannière
        </Btn>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Aperçu</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>
                    <Spinner />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="megaphone" size={22} />
                      </span>
                      <b>Aucune bannière</b>
                      <p>Créez une bannière pour mettre en avant une offre.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          maxWidth: 340,
                          padding: '4px 10px',
                          borderRadius: 'var(--r-pill)',
                          background: b.bgColor,
                          color: b.textColor,
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {b.message}
                      </span>
                    </td>
                    <td className="t-sub">{b.priority}</td>
                    <td>
                      {b.active ? (
                        <Pill tone="success" dot>
                          Active
                        </Pill>
                      ) : (
                        <Pill tone="neutral">Inactive</Pill>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="icon-btn" aria-label="Modifier" onClick={() => openEdit(b)}>
                          <Icon name="edit" size={16} />
                        </button>
                        <button className="icon-btn" aria-label="Supprimer" onClick={() => remove(b)}>
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
          title={editing ? 'Modifier la bannière' : 'Nouvelle bannière'}
          icon="megaphone"
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
          <div
            style={{
              textAlign: 'center',
              marginBottom: 16,
              padding: 8,
              background: form.bgColor,
              color: form.textColor,
              borderRadius: 'var(--r-md)',
            }}
          >
            {form.message || 'Aperçu de la bannière'}
            {form.linkLabel && (
              <strong style={{ marginLeft: 8, textDecoration: 'underline' }}>{form.linkLabel}</strong>
            )}
          </div>
          <div>
            <div className="field-label">Message</div>
            <input
              className="neo-field"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="-10 % sur votre première installation !"
            />
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Lien (URL)</div>
              <input
                className="neo-field"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <div className="field-label">Libellé du lien</div>
              <input
                className="neo-field"
                value={form.linkLabel}
                onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                placeholder="J'en profite"
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Fond</div>
              <input
                type="color"
                className="neo-field"
                style={{ height: 40, padding: 4 }}
                value={form.bgColor}
                onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Texte</div>
              <input
                type="color"
                className="neo-field"
                style={{ height: 40, padding: 4 }}
                value={form.textColor}
                onChange={(e) => setForm({ ...form, textColor: e.target.value })}
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Priorité</div>
              <input
                type="number"
                className="neo-field"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Début</div>
              <input
                type="datetime-local"
                className="neo-field"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Fin</div>
              <input
                type="datetime-local"
                className="neo-field"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
            <div />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.dismissible}
                onChange={(e) => setForm({ ...form, dismissible: e.target.checked })}
                style={{ accentColor: 'var(--komun)', width: 16, height: 16 }}
              />
              Fermable par le visiteur
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ accentColor: 'var(--komun)', width: 16, height: 16 }}
              />
              Active
            </label>
          </div>
        </MarketingModal>
      )}
    </>
  );
}

export default BannersTab;
