import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, Button, Spinner } from '../../components';
import { clientsService, projectsService } from '../../services';
import {
  projectStatusLabels,
  type Client,
  type CreateProjectInput,
  type ProjectStatus,
  type UpdateProjectInput,
} from '../../types';

interface FormState {
  clientId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  address: string;
  city: string;
  postalCode: string;
  surface: string;
  roomCount: string;
}

const EMPTY: FormState = {
  clientId: '',
  name: '',
  description: '',
  status: 'brouillon',
  address: '',
  city: '',
  postalCode: '',
  surface: '',
  roomCount: '',
};

export function ProjectFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const loadClients = clientsService.getClients(undefined, 1, 100);
    const loadProject = id ? projectsService.getProject(id) : Promise.resolve(null);

    Promise.all([loadClients, loadProject])
      .then(([clientsResult, project]) => {
        if (cancelled) return;
        setClients(clientsResult.data);
        if (project) {
          setForm({
            clientId: project.client.id,
            name: project.name,
            description: project.description ?? '',
            status: project.status,
            address: project.address ?? '',
            city: project.city ?? '',
            postalCode: project.postalCode ?? '',
            surface: project.surface ?? '',
            roomCount: project.roomCount != null ? String(project.roomCount) : '',
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Chargement impossible');
        navigate('/projets');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: CreateProjectInput & UpdateProjectInput = {
        clientId: form.clientId,
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        address: form.address || undefined,
        city: form.city || undefined,
        postalCode: form.postalCode || undefined,
        surface: form.surface ? Number(form.surface) : undefined,
        roomCount: form.roomCount ? Number(form.roomCount) : undefined,
      };
      if (isEdit && id) {
        await projectsService.updateProject(id, payload);
        toast.success('Projet mis à jour');
      } else {
        await projectsService.createProject(payload);
        toast.success('Projet créé');
      }
      navigate('/projets');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="content-area">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="content-area">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Button
          variant="outline-secondary"
          size="sm"
          icon="bi-arrow-left"
          onClick={() => navigate('/projets')}
        >
          Retour
        </Button>
        <h1 className="page-title mb-0">{isEdit ? 'Modifier' : 'Nouveau'} projet</h1>
      </div>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Client</label>
                <select
                  className="form-select"
                  required
                  value={form.clientId}
                  onChange={(e) => update('clientId', e.target.value)}
                >
                  <option value="" disabled>
                    Sélectionner un client…
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Nom du projet</label>
                <input
                  className="form-control"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Statut</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => update('status', e.target.value as ProjectStatus)}
                >
                  {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {projectStatusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Surface (m²)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.surface}
                  onChange={(e) => update('surface', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Nombre de pièces</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={form.roomCount}
                  onChange={(e) => update('roomCount', e.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Adresse</label>
                <input
                  className="form-control"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                />
              </div>
              <div className="col-md-8">
                <label className="form-label">Ville</label>
                <input
                  className="form-control"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Code postal</label>
                <input
                  className="form-control"
                  value={form.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button type="button" variant="outline-secondary" onClick={() => navigate('/projets')}>
                Annuler
              </Button>
              <Button type="submit" loading={saving} icon="bi-check-lg">
                {isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default ProjectFormPage;
