import { useState } from 'react';
import appointmentsService from '../../services/appointments.service';
import { Card, Btn, Icon } from '../../components/neo';
import type { IconName } from '../../components/neo';

interface Guide {
  name: string;
  icon: IconName;
  tone: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    name: 'Apple Calendar',
    icon: 'calendar',
    tone: 'var(--ink)',
    steps: ['Ouvrez Calendrier', 'Fichier → Nouvel abonnement', "Collez l'URL du feed", 'Validez'],
  },
  {
    name: 'Google Calendar',
    icon: 'calendar',
    tone: 'var(--komun)',
    steps: ['Ouvrez Google Calendar', "Autres agendas → S'abonner", "Collez l'URL du feed", 'Validez'],
  },
  {
    name: 'Outlook / Teams',
    icon: 'mail',
    tone: 'var(--ochre-ink)',
    steps: ['Ouvrez Outlook Calendar', 'Ajouter un calendrier → Internet', "Collez l'URL du feed", 'Validez'],
  },
];

export default function CalendarSyncPage() {
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await appointmentsService.generateCalendarToken();
      // Build full URL - in dev, frontend is on 5173 but API is on 3000
      const baseUrl = window.location.origin.replace('5173', '3000');
      setFeedUrl(`${baseUrl}${result.feedUrl}`);
    } catch (err) {
      console.error(err);
      setError('Impossible de generer le lien. Veuillez reessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyUrl = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const revokeToken = async () => {
    if (!window.confirm('Etes-vous sur de vouloir revoquer ce lien ? Le calendrier ne sera plus synchronise.')) {
      return;
    }
    setError(null);
    try {
      await appointmentsService.revokeCalendarToken();
      setFeedUrl(null);
    } catch (err) {
      console.error(err);
      setError('Impossible de revoquer le lien. Veuillez reessayer.');
    }
  };

  return (
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <h1>Synchronisation calendrier</h1>
          <p>Reliez vos rendez-vous Neo à votre agenda externe</p>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 13px',
            borderRadius: 8,
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger-soft)',
            color: 'var(--danger-ink)',
            fontSize: 13,
          }}
        >
          <Icon name="bell" size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <Btn variant="subtle" size="sm" icon="x" onClick={() => setError(null)} />
        </div>
      )}

      <div className="lead-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Synchroniser avec votre agenda externe" icon="calendar">
            <div className="card-body">
              <p style={{ color: 'var(--ink-3)', marginBottom: 18, lineHeight: 1.55 }}>
                Synchronisez vos rendez-vous Neo avec Apple Calendar, Google Calendar, Outlook ou
                tout autre client compatible iCal. Les rendez-vous apparaitront automatiquement
                dans votre agenda.
              </p>

              {!feedUrl ? (
                <Btn icon="send" onClick={generateToken} disabled={isLoading}>
                  {isLoading ? 'Génération…' : 'Générer mon lien de calendrier'}
                </Btn>
              ) : (
                <div>
                  <div className="field-label">Votre lien de calendrier</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <input
                      type="text"
                      className="neo-field"
                      value={feedUrl}
                      readOnly
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    />
                    <Btn
                      variant={copied ? 'success' : 'ghost'}
                      icon={copied ? 'check' : 'fileText'}
                      onClick={copyUrl}
                    >
                      {copied ? 'Copié !' : 'Copier'}
                    </Btn>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="subtle" size="sm" icon="zap" onClick={generateToken} disabled={isLoading}>
                      {isLoading ? 'Régénération…' : 'Régénérer'}
                    </Btn>
                    <Btn variant="danger-ghost" size="sm" icon="trash" onClick={revokeToken}>
                      Révoquer
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card head="Comment utiliser ?" icon="help">
            <div className="card-body">
              <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                {GUIDES.map((g) => (
                  <div key={g.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ color: g.tone, display: 'inline-flex' }}>
                        <Icon name={g.icon} size={20} />
                      </span>
                      <strong style={{ fontSize: 14 }}>{g.name}</strong>
                    </div>
                    <ol style={{ color: 'var(--ink-3)', fontSize: 13, paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
                      {g.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Informations" icon="inbox">
            <div className="card-body">
              <ul style={{ color: 'var(--ink-3)', fontSize: 13, paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
                <li>Le calendrier se met à jour automatiquement</li>
                <li>Les RDV des 30 derniers jours et 90 prochains jours sont synchronisés</li>
                <li>Régénérez le lien si vous suspectez un accès non autorisé</li>
                <li>Un seul lien actif par utilisateur</li>
              </ul>
            </div>
          </Card>

          <Card head="Sécurité" icon="shield">
            <div className="card-body">
              <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Le lien contient un jeton unique et personnel. Ne le partagez pas. Si le lien est
                compromis, révoquez-le et générez-en un nouveau.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
