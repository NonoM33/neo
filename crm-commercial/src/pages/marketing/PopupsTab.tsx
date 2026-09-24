import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn icon="plus" onClick={openCreate}>
          Nouvelle pop-up
        </Btn>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Fréquence</th>
                <th>Délai</th>
                <th>Statut</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <Spinner />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="message" size={22} />
                      </span>
                      <b>Aucune pop-up</b>
                      <p>Créez une pop-up pour capter l'attention de vos visiteurs.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="t-main">{p.title}</span>
                    </td>
                    <td className="t-sub">{FREQUENCY_LABEL[p.frequency]}</td>
                    <td className="t-sub">{`${p.delaySeconds}s`}</td>
                    <td>
                      {p.active ? (
                        <Pill tone="success" dot>
                          Active
                        </Pill>
                      ) : (
                        <Pill tone="neutral">Inactive</Pill>
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
          title={editing ? 'Modifier la pop-up' : 'Nouvelle pop-up'}
          icon="message"
          size="lg"
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
          <div>
            <div className="field-label">Titre</div>
            <input
              className="neo-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="field-label">Contenu (HTML autorisé)</div>
            <textarea
              className="neo-field"
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Image (URL)</div>
              <input
                className="neo-field"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div>
              <div className="field-label">Code promo mis en avant</div>
              <select
                className="neo-field"
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
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Libellé du bouton (CTA)</div>
              <input
                className="neo-field"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="J'en profite"
              />
            </div>
            <div>
              <div className="field-label">Lien du bouton (CTA)</div>
              <input
                className="neo-field"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Délai (s)</div>
              <input
                type="number"
                className="neo-field"
                value={form.delaySeconds}
                onChange={(e) => setForm({ ...form, delaySeconds: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Fréquence</div>
              <select
                className="neo-field"
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
          <div style={{ marginTop: 14 }}>
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

export default PopupsTab;
