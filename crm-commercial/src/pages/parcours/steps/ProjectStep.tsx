import { useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card } from '../../../components/neo';
import { parcoursService } from '../../../services';
import type { StepProps } from '../parcours.meta';

export function ProjectStep({ state, patch, next, back }: StepProps) {
  const { client, project } = state;
  const [form, setForm] = useState({
    name: project?.name ?? (client ? `Domotique ${client.lastName}` : ''),
    address: project?.address ?? client?.address ?? '',
    city: project?.city ?? client?.city ?? '',
    postalCode: project?.postalCode ?? client?.postalCode ?? '',
    surface: project?.surface ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    if (!client) {
      toast.error('Sélectionnez d\'abord un client');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Nom du projet requis');
      return;
    }
    setSaving(true);
    try {
      const body = {
        clientId: client.id,
        name: form.name.trim(),
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.city.trim() ? { city: form.city.trim() } : {}),
        ...(form.postalCode.trim() ? { postalCode: form.postalCode.trim() } : {}),
        ...(form.surface !== '' ? { surface: Number(form.surface) } : {}),
      };
      const saved = project
        ? await parcoursService.updateProject(project.id, body)
        : await parcoursService.createProject(body);
      patch({ project: saved });
      next();
    } catch {
      toast.error('Enregistrement du projet impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="parcours-lead">Le projet</h2>
      <p className="parcours-sub">
        Quelques infos pour démarrer l'audit chez {client ? client.firstName : 'le client'}.
      </p>

      <Card>
        <label className="field-label">Nom du projet</label>
        <input className="neo-field" value={form.name} onChange={set('name')} />
        <div className="parcours-grid2" style={{ marginTop: 14 }}>
          <div>
            <label className="field-label">Adresse</label>
            <input className="neo-field" value={form.address} onChange={set('address')} />
          </div>
          <div>
            <label className="field-label">Ville</label>
            <input className="neo-field" value={form.city} onChange={set('city')} />
          </div>
          <div>
            <label className="field-label">Code postal</label>
            <input className="neo-field" value={form.postalCode} onChange={set('postalCode')} />
          </div>
          <div>
            <label className="field-label">Surface (m²)</label>
            <input className="neo-field" type="number" value={form.surface} onChange={set('surface')} />
          </div>
        </div>
      </Card>

      <div className="parcours-footnav">
        <Btn variant="subtle" icon="arrowLeft" onClick={back}>
          Retour
        </Btn>
        <span style={{ flex: 1 }} />
        <Btn variant="primary" iconRight="arrowRight" disabled={saving} onClick={save}>
          {project ? 'Continuer' : 'Créer le projet'}
        </Btn>
      </div>
    </div>
  );
}
