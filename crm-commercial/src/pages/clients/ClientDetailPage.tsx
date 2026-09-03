import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { activitiesService, clientsService, devisService, projectsService } from '../../services';
import {
  projectStatusLabels,
  quoteStatusLabels,
  type Activity,
  type Client,
  type Project,
  type ProjectStatus,
  type QuoteListItem,
  type QuoteStatus,
} from '../../types';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR') : '—';

const projectTone: Record<ProjectStatus, PillTone> = {
  brouillon: 'neutral',
  en_cours: 'info',
  termine: 'success',
  archive: 'dark',
};

const quoteTone: Record<QuoteStatus, PillTone> = {
  brouillon: 'neutral',
  envoye: 'info',
  accepte: 'success',
  refuse: 'danger',
  expire: 'warning',
};

export function ClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      clientsService.getClient(id),
      projectsService.getProjects({ clientId: id }, 1, 100),
      activitiesService.getActivities({ clientId: id }, 1, 20),
    ])
      .then(async ([clientResult, projectsResult, activitiesResult]) => {
        if (cancelled) return;
        setClient(clientResult);
        setProjects(projectsResult.data);
        setActivities(activitiesResult.data);

        // Il n'y a pas d'endpoint « devis d'un client » : on agrège par projet.
        const perProject = await Promise.all(
          projectsResult.data.map((project) =>
            devisService.getQuotesByProject(project.id).catch(() => [] as QuoteListItem[])
          )
        );
        if (!cancelled) setQuotes(perProject.flat());
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Client introuvable');
        navigate('/clients');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading || !client) {
    return <Spinner />;
  }

  const totalTTC = quotes.reduce((sum, quote) => sum + Number(quote.totalTTC ?? 0), 0);

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/clients')}>
            <Icon name="arrowLeft" size={15} /> Retour aux clients
          </button>
          <h1>
            {client.firstName} {client.lastName}
          </h1>
          <p className="t-sub">Client depuis le {formatDate(client.createdAt)}</p>
        </div>
        <div className="ph-r" style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" icon="edit" onClick={() => navigate(`/clients/${client.id}/edit`)}>
            Modifier
          </Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <Card
            head={`Projets (${projects.length})`}
            icon="folder"
            flush
            action={
              <Btn
                variant="ghost"
                size="sm"
                icon="plus"
                onClick={() => navigate(`/projets/new?clientId=${client.id}`)}
              >
                Ajouter
              </Btn>
            }
          >
            {projects.length === 0 ? (
              <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
                <p className="t-sub">Aucun projet</p>
                <Btn
                  size="sm"
                  icon="plus"
                  onClick={() => navigate(`/projets/new?clientId=${client.id}`)}
                >
                  Créer un projet
                </Btn>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Statut</th>
                      <th>Créé le</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td>{project.name}</td>
                        <td>
                          <Pill tone={projectTone[project.status]}>
                            {projectStatusLabels[project.status]}
                          </Pill>
                        </td>
                        <td className="t-sub">{formatDate(project.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Btn
                            variant="ghost"
                            size="sm"
                            icon="edit"
                            title="Modifier le projet"
                            onClick={() => navigate(`/projets/${project.id}/edit`)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            head={`Devis (${quotes.length})`}
            icon="fileText"
            flush
            action={
              <Btn
                variant="ghost"
                size="sm"
                icon="plus"
                onClick={() => navigate(`/devis/new?clientId=${client.id}`)}
              >
                Ajouter
              </Btn>
            }
          >
            {quotes.length === 0 ? (
              <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
                <p className="t-sub">Aucun devis</p>
                <Btn
                  size="sm"
                  icon="plus"
                  onClick={() => navigate(`/devis/new?clientId=${client.id}`)}
                >
                  Créer un devis
                </Btn>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Total TTC</th>
                      <th>Créé le</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => (
                      <tr
                        key={quote.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/devis/${quote.id}`)}
                      >
                        <td>{quote.number}</td>
                        <td>
                          <Pill tone={quoteTone[quote.status]}>{quoteStatusLabels[quote.status]}</Pill>
                        </td>
                        <td className="t-mono" style={{ textAlign: 'right' }}>
                          {currency.format(Number(quote.totalTTC ?? 0))}
                        </td>
                        <td className="t-sub">{formatDate(quote.createdAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Icon name="chevronRight" size={15} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            head={`Activités (${activities.length})`}
            icon="calendar"
            flush
            action={
              <Btn
                variant="ghost"
                size="sm"
                icon="plus"
                onClick={() => navigate(`/activities/new?clientId=${client.id}`)}
              >
                Ajouter
              </Btn>
            }
          >
            {activities.length === 0 ? (
              <div className="empty-state" style={{ padding: 24, textAlign: 'center' }}>
                <p className="t-sub">Aucune activité</p>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Sujet</th>
                      <th>Type</th>
                      <th>Prévue le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity) => (
                      <tr key={activity.id}>
                        <td>{activity.subject}</td>
                        <td className="t-sub">{activity.type}</td>
                        <td className="t-sub">{formatDate(activity.scheduledAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <Card head="Coordonnées" icon="user">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <dt>Email</dt>
                  <dd>{client.email ?? '—'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <dt>Téléphone</dt>
                  <dd>{client.phone ?? '—'}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <dt>Adresse</dt>
                  <dd style={{ textAlign: 'right' }}>
                    {client.address ?? '—'}
                    {client.city && (
                      <>
                        <br />
                        {client.postalCode} {client.city}
                      </>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {client.notes && (
            <Card head="Notes" icon="fileText">
              <div className="card-body">
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{client.notes}</p>
              </div>
            </Card>
          )}

          <Card head="Résumé" icon="chart">
            <div className="card-body">
              <dl className="detail-dl">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Projets</dt>
                  <dd className="t-mono">{projects.length}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Devis</dt>
                  <dd className="t-mono">{quotes.length}</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt>Total devis TTC</dt>
                  <dd className="t-mono">{currency.format(totalTTC)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card head="Actions rapides" icon="zap">
            <div className="card-body" style={{ display: 'grid', gap: 8 }}>
              <Btn
                variant="ghost"
                icon="fileText"
                onClick={() => navigate(`/devis/new?clientId=${client.id}`)}
              >
                Nouveau devis
              </Btn>
              <Btn
                variant="ghost"
                icon="folder"
                onClick={() => navigate(`/projets/new?clientId=${client.id}`)}
              >
                Nouveau projet
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ClientDetailPage;
