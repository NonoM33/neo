import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { projectStatusLabels, type Project, type ProjectStatus } from '../../types';
import { projectsService } from '../../services';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<ProjectStatus, PillTone> = {
  brouillon: 'neutral',
  en_cours: 'info',
  termine: 'success',
  archive: 'dark',
};

export function ProjectsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | ProjectStatus>('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectsService.getProjects(
        { search: search.trim() || undefined, status: status || undefined },
        page,
        PAGE_SIZE
      );
      setProjects(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Impossible de charger les projets');
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search, status]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Supprimer le projet « ${project.name} » ?`)) return;
    try {
      await projectsService.deleteProject(project.id);
      toast.success('Projet supprimé');
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Suppression impossible');
    }
  };

  return (
    <div className="projects-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Projets</h1>
          <p>
            {total} projet{total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => navigate('/projets/new')}>
            Nouveau projet
          </Btn>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div className="fbar-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="neo-field"
              placeholder="Rechercher par nom ou description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="neo-field"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | ProjectStatus)}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {projectStatusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Client</th>
                <th>Ville</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projets/${p.id}/edit`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="t-main">{p.name}</td>
                  <td className="t-sub">
                    {p.client.firstName} {p.client.lastName}
                  </td>
                  <td className="t-sub">{p.city || '—'}</td>
                  <td>
                    <Pill tone={STATUS_TONE[p.status]} dot>
                      {projectStatusLabels[p.status]}
                    </Pill>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="icon-btn"
                        aria-label="Modifier"
                        onClick={() => navigate(`/projets/${p.id}/edit`)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="icon-btn" aria-label="Supprimer" onClick={() => handleDelete(p)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="folder" size={22} />
                      </span>
                      <b>Aucun projet</b>
                      <p>Ajustez vos filtres ou créez un nouveau projet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px',
                borderTop: '1px solid var(--line)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                Page {page} / {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn
                  variant="subtle"
                  size="sm"
                  icon="arrowLeft"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Btn>
                <Btn
                  variant="subtle"
                  size="sm"
                  iconRight="arrowRight"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
