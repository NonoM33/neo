import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Card, Btn, Icon } from '../../components/neo';
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
  const [searchParams] = useSearchParams();
  // Arrivee depuis une fiche client : le client est deja choisi.
  const presetClientId = searchParams.get('clientId') ?? '';
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
        if (!project && presetClientId) {
          setForm((prev) => ({ ...prev, clientId: presetClientId }));
        }
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
  }, [id, navigate, presetClientId]);

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
      navigate(presetClientId ? `/clients/${presetClientId}` : '/projets');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div style={{ padding: 28, maxWidth: 860, margin: '0 auto' }}>
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/projets')}>
            <Icon name="arrowLeft" size={15} /> Retour aux projets
          </button>
          <h1>{isEdit ? 'Modifier le projet' : 'Nouveau projet'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card head="Projet" icon="folder">
          <div className="card-body">
            <div className="field-grid" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <div>
                <div className="field-label">Client *</div>
                <select
                  className="neo-field"
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
              <div>
                <div className="field-label">Nom du projet *</div>
                <input
                  className="neo-field"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Description</div>
              <textarea
                className="neo-field"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
            <div className="field-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <div className="field-label">Statut</div>
                <select
                  className="neo-field"
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
              <div>
                <div className="field-label">Surface (m²)</div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="neo-field"
                  value={form.surface}
                  onChange={(e) => update('surface', e.target.value)}
                />
              </div>
              <div>
                <div className="field-label">Nombre de pièces</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="neo-field"
                  value={form.roomCount}
                  onChange={(e) => update('roomCount', e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="field-label">Adresse</div>
              <input
                className="neo-field"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </div>
            <div className="field-grid">
              <div>
                <div className="field-label">Ville</div>
                <input
                  className="neo-field"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div>
                <div className="field-label">Code postal</div>
                <input
                  className="neo-field"
                  value={form.postalCode}
                  onChange={(e) => update('postalCode', e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Btn type="button" variant="subtle" onClick={() => navigate('/projets')}>
            Annuler
          </Btn>
          <Btn type="submit" icon="check" disabled={saving}>
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
          </Btn>
        </div>
      </form>
    </div>
  );
}

export default ProjectFormPage;
