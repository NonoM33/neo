import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { newsletterService } from '../../services';
import {
  campaignStatusLabels,
  recipientStatusLabels,
} from '../../types/newsletter.types';
import type {
  CampaignStats,
  EmailCampaign,
  EmailCampaignRecipient,
} from '../../types/newsletter.types';

const CAMPAIGN_TONE: Record<EmailCampaign['status'], PillTone> = {
  brouillon: 'neutral',
  envoi: 'info',
  envoyee: 'success',
  echec: 'danger',
};

const RECIPIENT_TONE: Record<EmailCampaignRecipient['status'], PillTone> = {
  en_attente: 'neutral',
  envoye: 'info',
  ouvert: 'success',
  echec: 'danger',
  desinscrit: 'warning',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await newsletterService.getCampaign(id);
        if (cancelled) return;
        setStats(data);
        setSubject(data.campaign.subject);
        setHtml(data.campaign.html);
      } catch (error) {
        console.error('Failed to load campaign:', error);
        toast.error('Impossible de charger la campagne');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    if (!subject.trim() || !html.trim()) {
      toast.error('Sujet et contenu obligatoires');
      return;
    }
    setSaving(true);
    try {
      const data = await newsletterService.updateCampaign(id, {
        subject: subject.trim(),
        html,
      });
      setStats(data);
      toast.success('Campagne enregistrée');
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!id || !stats) return;
    if (
      !window.confirm(
        `Envoyer cette campagne à ${stats.campaign.totalRecipients} destinataires ? Cette action est irréversible.`
      )
    ) {
      return;
    }
    setSending(true);
    try {
      const result = await newsletterService.sendCampaign(id);
      toast.success(`Envoyée : ${result.sent} réussis, ${result.failed} échecs`);
      const data = await newsletterService.getCampaign(id);
      setStats(data);
    } catch {
      toast.error("Échec de l'envoi");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (!stats) {
    return (
      <div className="campaign-page">
        <div className="empty">Campagne introuvable.</div>
      </div>
    );
  }

  const { campaign, openRate, recipients } = stats;
  const editable = campaign.status === 'brouillon';

  return (
    <div className="campaign-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>{campaign.subject || 'Campagne'}</h1>
          <p>
            <Pill tone={CAMPAIGN_TONE[campaign.status]}>
              {campaignStatusLabels[campaign.status]}
            </Pill>{' '}
            · {campaign.totalRecipients} destinataires · créée le{' '}
            {formatDateTime(campaign.createdAt)}
          </p>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" icon="arrowLeft" onClick={() => navigate('/newsletter')}>
            Retour
          </Btn>
          {editable && (
            <>
              <Btn variant="subtle" icon="check" onClick={handleSave} disabled={saving}>
                Enregistrer
              </Btn>
              <Btn icon="send" onClick={handleSend} disabled={sending}>
                Envoyer ({campaign.totalRecipients})
              </Btn>
            </>
          )}
        </div>
      </div>

      <div className="stat-grid mb-22">
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Destinataires</span>
          </div>
          <div className="st-val">{campaign.totalRecipients}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Envoyés</span>
          </div>
          <div className="st-val">{campaign.sentCount}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Ouvertures</span>
          </div>
          <div className="st-val">{campaign.openedCount}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Taux d'ouverture</span>
          </div>
          <div className="st-val">{Math.round(openRate * 100)}%</div>
        </div>
      </div>

      <div className="grid-2 mb-22" style={{ alignItems: 'start' }}>
        <Card head="Contenu de l'email" icon="edit">
          <div className="field-label">Sujet</div>
          <input
            className="neo-field"
            value={subject}
            disabled={!editable}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <div className="field-label">Contenu HTML</div>
            <textarea
              className="neo-field"
              rows={16}
              value={html}
              disabled={!editable}
              onChange={(e) => setHtml(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>
        </Card>

        <Card head="Aperçu" icon="eyeOff">
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-md, 10px)',
              padding: 16,
              maxHeight: 520,
              overflow: 'auto',
              background: 'var(--paper-2)',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </Card>
      </div>

      <Card head="Destinataires" icon="users">
        {recipients.length === 0 ? (
          <div className="empty">Aucun destinataire enregistré.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Statut</th>
                  <th>Envoyé</th>
                  <th>Ouvert</th>
                  <th>Ouvertures</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td className="t-main">{r.email}</td>
                    <td>
                      <Pill tone={RECIPIENT_TONE[r.status]}>
                        {recipientStatusLabels[r.status]}
                      </Pill>
                    </td>
                    <td className="t-sub">{formatDateTime(r.sentAt)}</td>
                    <td className="t-sub">{formatDateTime(r.openedAt)}</td>
                    <td className="t-mono">{r.openCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default CampaignPage;
