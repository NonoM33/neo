import { useState } from 'react';
import appointmentsService from '../../services/appointments.service';

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
    <div className="content-area" style={{ padding: 25 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="page-title">Synchronisation calendrier</h1>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Fermer"></button>
        </div>
      )}

      <div className="row">
        <div className="col-lg-8">
          {/* Main card */}
          <div className="card mb-4">
            <div className="card-header d-flex align-items-center">
              <i className="bi bi-calendar-check me-2"></i>
              Synchroniser avec votre agenda externe
            </div>
            <div className="card-body">
              <p className="text-muted mb-4">
                Synchronisez vos rendez-vous Neo avec Apple Calendar, Google Calendar,
                Outlook ou tout autre client compatible iCal. Les rendez-vous apparaitront
                automatiquement dans votre agenda.
              </p>

              {!feedUrl ? (
                <button
                  className="btn btn-primary"
                  onClick={generateToken}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Generation...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-link-45deg me-2"></i>
                      Generer mon lien de calendrier
                    </>
                  )}
                </button>
              ) : (
                <div>
                  <label className="form-label fw-semibold">Votre lien de calendrier :</label>
                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={feedUrl}
                      readOnly
                      style={{ fontSize: '0.85rem' }}
                    />
                    <button
                      className={`btn ${copied ? 'btn-success' : 'btn-outline-primary'}`}
                      onClick={copyUrl}
                    >
                      <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'} me-1`}></i>
                      {copied ? 'Copie !' : 'Copier'}
                    </button>
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={generateToken} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          Regeneration...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Regenerer
                        </>
                      )}
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={revokeToken}>
                      <i className="bi bi-trash me-1"></i>
                      Revoquer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="card">
            <div className="card-header d-flex align-items-center">
              <i className="bi bi-question-circle me-2"></i>
              Comment utiliser ?
            </div>
            <div className="card-body">
              <div className="row g-4">
                {/* Apple Calendar */}
                <div className="col-md-4">
                  <div className="text-center mb-3">
                    <i className="bi bi-apple" style={{ fontSize: '2rem', color: 'var(--neo-text-primary)' }}></i>
                  </div>
                  <h6 className="text-center fw-semibold">Apple Calendar</h6>
                  <ol className="small text-muted ps-3">
                    <li>Ouvrez Calendrier</li>
                    <li>Fichier &rarr; Nouvel abonnement</li>
                    <li>Collez l'URL du feed</li>
                    <li>Validez</li>
                  </ol>
                </div>

                {/* Google Calendar */}
                <div className="col-md-4">
                  <div className="text-center mb-3">
                    <i className="bi bi-google" style={{ fontSize: '2rem', color: '#4285F4' }}></i>
                  </div>
                  <h6 className="text-center fw-semibold">Google Calendar</h6>
                  <ol className="small text-muted ps-3">
                    <li>Ouvrez Google Calendar</li>
                    <li>Autres agendas &rarr; S'abonner</li>
                    <li>Collez l'URL du feed</li>
                    <li>Validez</li>
                  </ol>
                </div>

                {/* Outlook */}
                <div className="col-md-4">
                  <div className="text-center mb-3">
                    <i className="bi bi-microsoft" style={{ fontSize: '2rem', color: '#00A4EF' }}></i>
                  </div>
                  <h6 className="text-center fw-semibold">Outlook / Teams</h6>
                  <ol className="small text-muted ps-3">
                    <li>Ouvrez Outlook Calendar</li>
                    <li>Ajouter un calendrier &rarr; Internet</li>
                    <li>Collez l'URL du feed</li>
                    <li>Validez</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="col-lg-4">
          <div className="card" style={{ backgroundColor: 'var(--neo-bg-light)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                <i className="bi bi-info-circle me-2 text-primary"></i>
                Informations
              </h6>
              <ul className="small text-muted mb-0 ps-3">
                <li className="mb-2">Le calendrier se met a jour automatiquement</li>
                <li className="mb-2">Les RDV des 30 derniers jours et 90 prochains jours sont synchronises</li>
                <li className="mb-2">Regenerez le lien si vous suspectez un acces non autorise</li>
                <li>Un seul lien actif par utilisateur</li>
              </ul>
            </div>
          </div>

          <div className="card mt-4" style={{ backgroundColor: 'var(--neo-bg-light)' }}>
            <div className="card-body">
              <h6 className="fw-semibold mb-3">
                <i className="bi bi-shield-check me-2 text-success"></i>
                Securite
              </h6>
              <p className="small text-muted mb-0">
                Le lien contient un jeton unique et personnel. Ne le partagez pas.
                Si le lien est compromis, revoquez-le et generez-en un nouveau.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
