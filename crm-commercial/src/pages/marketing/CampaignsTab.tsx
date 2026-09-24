import { useEffect, useState, useCallback } from 'react';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { marketingService } from '../../services';
import { useUIStore } from '../../stores';
import type {
  CampaignAudience,
  CampaignPayload,
  CampaignStatus,
  MarketingCampaign,
  PromoCode,
} from '../../types/marketing.types';
import { MarketingModal } from './MarketingModal';

interface FormState {
  name: string;
  subject: string;
  html: string;
  audience: CampaignAudience;
  customEmails: string;
  promoCodeId: string;
  scheduledAt: string;
}

const EMPTY: FormState = {
  name: '',
  subject: '',
  html: '',
  audience: 'clients',
  customEmails: '',
  promoCodeId: '',
  scheduledAt: '',
};

const AUDIENCE_LABEL: Record<CampaignAudience, string> = {
  clients: 'Clients',
  leads: 'Leads',
  custom: 'Liste personnalisée',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  brouillon: 'Brouillon',
  programmee: 'Programmée',
  envoi: 'Envoi en cours',
  envoyee: 'Envoyée',
  echec: 'Échec',
};

const STATUS_TONE: Record<CampaignStatus, PillTone> = {
  brouillon: 'neutral',
  programmee: 'info',
  envoi: 'warning',
  envoyee: 'success',
  echec: 'danger',
};

function fromForm(form: FormState): CampaignPayload {
  return {
    name: form.name.trim(),
    subject: form.subject.trim(),
    html: form.html,
    audience: form.audience,
    customEmails:
      form.audience === 'custom'
        ? form.customEmails
            .split(/[\n,;]+/)
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
    promoCodeId: form.promoCodeId || null,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
  };
}

function isEditable(status: CampaignStatus): boolean {
  return status === 'brouillon' || status === 'programmee' || status === 'echec';
}

export function CampaignsTab() {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<MarketingCampaign[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [campaigns, promos] = await Promise.all([
        marketingService.listCampaigns(),
        marketingService.listPromoCodes(),
      ]);
      setItems(campaigns);
      setPromoCodes(promos);
    } catch (err) {
      console.error(err);
      addToast('error', 'Erreur lors du chargement des campagnes');
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

  function openEdit(c: MarketingCampaign) {
    setEditing(c);
    setForm({
      name: c.name,
      subject: c.subject,
      html: c.html,
      audience: c.audience,
      customEmails: c.customEmails.join('\n'),
      promoCodeId: c.promoCodeId ?? '',
      scheduledAt: c.scheduledAt
        ? (() => {
            const d = new Date(c.scheduledAt as string);
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          })()
        : '',
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.subject.trim() || !form.html.trim()) {
      addToast('error', 'Nom, objet et contenu requis');
      return;
    }
    setSaving(true);
    try {
      const payload = fromForm(form);
      if (editing) {
        await marketingService.updateCampaign(editing.id, payload);
        addToast('success', 'Campagne mise à jour');
      } else {
        await marketingService.createCampaign(payload);
        addToast('success', 'Campagne créée');
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

  async function send(c: MarketingCampaign) {
    if (!window.confirm(`Envoyer la campagne « ${c.name} » maintenant ?`)) return;
    setSendingId(c.id);
    try {
      const updated = await marketingService.sendCampaign(c.id);
      addToast('success', `Campagne envoyée à ${updated.sentCount} destinataire(s)`);
      await load();
    } catch (err) {
      console.error(err);
      addToast('error', "Échec de l'envoi");
    } finally {
      setSendingId(null);
    }
  }

  async function remove(c: MarketingCampaign) {
    if (!window.confirm(`Supprimer la campagne « ${c.name} » ?`)) return;
    try {
      await marketingService.deleteCampaign(c.id);
      addToast('success', 'Campagne supprimée');
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
          Nouvelle campagne
        </Btn>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Campagne</th>
                <th>Audience</th>
                <th>Envoyés</th>
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
                        <Icon name="mail" size={22} />
                      </span>
                      <b>Aucune campagne</b>
                      <p>Créez une campagne email pour toucher vos contacts.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="t-main">{c.name}</span>
                      <div className="t-sub">{c.subject}</div>
                    </td>
                    <td className="t-sub">{AUDIENCE_LABEL[c.audience]}</td>
                    <td className="t-sub">
                      {c.totalRecipients > 0 ? `${c.sentCount} / ${c.totalRecipients}` : '—'}
                    </td>
                    <td>
                      <Pill tone={STATUS_TONE[c.status]} dot>
                        {STATUS_LABEL[c.status]}
                      </Pill>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {isEditable(c.status) && (
                          <Btn
                            size="sm"
                            variant="success"
                            icon="send"
                            disabled={sendingId === c.id}
                            onClick={() => send(c)}
                          >
                            {sendingId === c.id ? 'Envoi…' : 'Envoyer'}
                          </Btn>
                        )}
                        {isEditable(c.status) && (
                          <button className="icon-btn" aria-label="Modifier" onClick={() => openEdit(c)}>
                            <Icon name="edit" size={16} />
                          </button>
                        )}
                        <button className="icon-btn" aria-label="Supprimer" onClick={() => remove(c)}>
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
          title={editing ? 'Modifier la campagne' : 'Nouvelle campagne'}
          icon="mail"
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
          <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <div>
              <div className="field-label">Nom interne</div>
              <input
                className="neo-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <div className="field-label">Objet de l'email</div>
              <input
                className="neo-field"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
          </div>
          <div className="field-grid">
            <div>
              <div className="field-label">Audience</div>
              <select
                className="neo-field"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as CampaignAudience })}
              >
                {(Object.keys(AUDIENCE_LABEL) as CampaignAudience[]).map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="field-label">Code promo (jeton {'{{promoCode}}'})</div>
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
          {form.audience === 'custom' && (
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Emails (un par ligne ou séparés par des virgules)</div>
              <textarea
                className="neo-field"
                rows={3}
                value={form.customEmails}
                onChange={(e) => setForm({ ...form, customEmails: e.target.value })}
              />
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <div className="field-label">Contenu HTML</div>
            <textarea
              className="neo-field"
              style={{ fontFamily: 'var(--font-mono)' }}
              rows={8}
              value={form.html}
              onChange={(e) => setForm({ ...form, html: e.target.value })}
              placeholder="<h1>Offre spéciale</h1><p>Profitez du code {{promoCode}}</p>"
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="field-label">Programmer (optionnel)</div>
            <input
              type="datetime-local"
              className="neo-field"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>
        </MarketingModal>
      )}
    </>
  );
}

export default CampaignsTab;
