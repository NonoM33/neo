import { useEffect, useState, useCallback } from 'react';
import { Button, Table } from '../../components';
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

const STATUS_META: Record<CampaignStatus, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'var(--neo-status-prospect)' },
  programmee: { label: 'Programmée', color: 'var(--neo-status-qualifie)' },
  envoi: { label: 'Envoi en cours', color: 'var(--neo-status-negociation)' },
  envoyee: { label: 'Envoyée', color: 'var(--neo-status-gagne)' },
  echec: { label: 'Échec', color: 'var(--neo-status-perdu)' },
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
      <div className="d-flex justify-content-end mb-3">
        <Button icon="bi-plus-lg" onClick={openCreate}>
          Nouvelle campagne
        </Button>
      </div>

      <Table
        data={items}
        loading={loading}
        keyExtractor={(c) => c.id}
        emptyMessage="Aucune campagne"
        columns={[
          {
            key: 'name',
            header: 'Campagne',
            render: (c) => (
              <div>
                <span className="fw-semibold d-block">{c.name}</span>
                <span style={{ color: 'var(--neo-text-secondary)', fontSize: '0.8rem' }}>
                  {c.subject}
                </span>
              </div>
            ),
          },
          { key: 'audience', header: 'Audience', render: (c) => AUDIENCE_LABEL[c.audience] },
          {
            key: 'sent',
            header: 'Envoyés',
            render: (c) =>
              c.totalRecipients > 0 ? `${c.sentCount} / ${c.totalRecipients}` : '—',
          },
          {
            key: 'status',
            header: 'Statut',
            render: (c) => (
              <span className="badge" style={{ background: STATUS_META[c.status].color }}>
                {STATUS_META[c.status].label}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-end',
            render: (c) => (
              <div className="d-flex gap-2 justify-content-end">
                {isEditable(c.status) && (
                  <Button
                    size="sm"
                    variant="success"
                    icon="bi-send"
                    loading={sendingId === c.id}
                    onClick={() => send(c)}
                  >
                    Envoyer
                  </Button>
                )}
                {isEditable(c.status) && (
                  <Button size="sm" variant="outline-secondary" icon="bi-pencil" onClick={() => openEdit(c)}>
                    {''}
                  </Button>
                )}
                <Button size="sm" variant="danger" icon="bi-trash" onClick={() => remove(c)}>
                  {''}
                </Button>
              </div>
            ),
          },
        ]}
      />

      {showForm && (
        <MarketingModal
          title={editing ? 'Modifier la campagne' : 'Nouvelle campagne'}
          icon="bi-envelope-paper"
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
            <div className="col-md-6">
              <label className="form-label">Nom interne</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Objet de l'email</label>
              <input
                className="form-control"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Audience</label>
              <select
                className="form-select"
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
            <div className="col-md-6">
              <label className="form-label">Code promo (jeton {'{{promoCode}}'})</label>
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
            {form.audience === 'custom' && (
              <div className="col-12">
                <label className="form-label">Emails (un par ligne ou séparés par des virgules)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.customEmails}
                  onChange={(e) => setForm({ ...form, customEmails: e.target.value })}
                />
              </div>
            )}
            <div className="col-12">
              <label className="form-label">Contenu HTML</label>
              <textarea
                className="form-control font-monospace"
                rows={8}
                value={form.html}
                onChange={(e) => setForm({ ...form, html: e.target.value })}
                placeholder="<h1>Offre spéciale</h1><p>Profitez du code {{promoCode}}</p>"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Programmer (optionnel)</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
          </div>
        </MarketingModal>
      )}
    </>
  );
}

export default CampaignsTab;
