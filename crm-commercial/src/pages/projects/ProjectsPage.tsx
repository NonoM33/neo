import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Table, Button } from '../../components';
import { projectsService } from '../../services';
import { projectStatusLabels, type Project, type ProjectStatus } from '../../types';

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<ProjectStatus, string> = {
  brouillon: 'secondary',
  en_cours: 'primary',
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
    <div className="content-area">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Projets</h1>
          <p className="text-secondary mb-0">
            {total} projet{total > 1 ? 's' : ''}
          </p>
        </div>
        <Button icon="bi-plus-lg" onClick={() => navigate('/projets/new')}>
          Nouveau projet
        </Button>
      </div>

      <Card className="mb-4">
        <CardBody>
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-transparent">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Rechercher par nom ou description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
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
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Table<Project>
            loading={loading}
            data={projects}
            keyExtractor={(p) => p.id}
            emptyMessage="Aucun projet"
            columns={[
              {
                key: 'name',
                header: 'Projet',
                render: (p) => <span className="fw-semibold">{p.name}</span>,
              },
              {
                key: 'client',
                header: 'Client',
                render: (p) => `${p.client.firstName} ${p.client.lastName}`,
              },
              { key: 'city', header: 'Ville', render: (p) => p.city || '—' },
              {
                key: 'status',
                header: 'Statut',
                render: (p) => (
                  <span className={`badge bg-${STATUS_VARIANT[p.status]}`}>
                    {projectStatusLabels[p.status]}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                className: 'text-end',
                render: (p) => (
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-pencil"
                      onClick={() => navigate(`/projets/${p.id}/edit`)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      icon="bi-trash"
                      onClick={() => handleDelete(p)}
                    >
                      Supprimer
                    </Button>
                  </div>
                ),
              },
            ]}
          />

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <span className="text-secondary small">
                Page {page} / {totalPages}
              </span>
              <div className="btn-group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default ProjectsPage;
