import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Btn, Card, Icon, Pill } from '../../../components/neo';
import { parcoursService } from '../../../services';
import type { StepProps } from '../parcours.meta';
import { StepNav } from './StepNav';

export function CloudStep({ state, patch, next, back }: StepProps) {
  const { client, instance } = state;
  const [memory, setMemory] = useState('512');
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);

  const provision = async () => {
    if (!client) return;
    setBusy(true);
    try {
      const inst = await parcoursService.provisionInstance({
        clientId: client.id,
        memoryLimitMb: Number(memory) || 512,
        ...(domain.trim() ? { domain: domain.trim() } : {}),
      });
      patch({ instance: inst });
      void parcoursService.startInstance(inst.id).catch(() => undefined);
      toast.success('Instance provisionnée');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        toast.error('Provisioning réservé aux comptes admin — étape ignorable');
      } else {
        toast.error('Provisioning de l\'instance impossible');
      }
    } finally {
      setBusy(false);
    }
  };

  if (instance) {
    return (
      <div>
        <h2 className="parcours-lead">Box dans le cloud</h2>
        <p className="parcours-sub">L'instance Home Assistant du client est provisionnée.</p>
        <Card>
          <div className="parcours-row">
            <span className="parcours-badge">
              <Icon name="cloud" size={18} />
            </span>
            <div style={{ flex: 1 }}>
              <div className="t-main">{instance.domain || 'Instance HA'}</div>
              <div className="t-sub">Statut : {instance.status}</div>
            </div>
            <Pill tone="info">{instance.status}</Pill>
          </div>
        </Card>
        <StepNav onBack={back} onNext={next} nextLabel="Finaliser" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="parcours-lead">Mise en service</h2>
      <p className="parcours-sub">Créez l'instance domotique cloud du client.</p>
      <Card>
        <div className="parcours-grid2">
          <div>
            <label className="field-label">Mémoire</label>
            <select className="neo-field" value={memory} onChange={(e) => setMemory(e.target.value)}>
              <option value="512">512 Mo</option>
              <option value="1024">1 Go</option>
              <option value="2048">2 Go</option>
            </select>
          </div>
          <div>
            <label className="field-label">Sous-domaine (optionnel)</label>
            <input className="neo-field" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Btn variant="primary" size="lg" icon="rocket" disabled={busy} onClick={provision}>
            Provisionner l'instance
          </Btn>
        </div>
      </Card>
      <div className="parcours-footnav">
        <Btn variant="subtle" icon="arrowLeft" onClick={back}>
          Retour
        </Btn>
        <span style={{ flex: 1 }} />
        <Btn variant="ghost" iconRight="arrowRight" onClick={next}>
          Ignorer cette étape
        </Btn>
      </div>
    </div>
  );
}
