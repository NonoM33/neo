import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Icon, type IconName } from '../../components/neo';
import type { ParcoursState } from '../../types/parcours.types';
import type { StepProps } from './parcours.meta';
import { ClientStep } from './steps/ClientStep';
import { ProjectStep } from './steps/ProjectStep';
import { AuditStep } from './steps/AuditStep';
import { QuoteStep } from './steps/QuoteStep';
import { SignStep } from './steps/SignStep';
import { InvoiceStep } from './steps/InvoiceStep';
import { CloudStep } from './steps/CloudStep';
import { DoneStep } from './steps/DoneStep';

const LS_KEY = 'neo.parcours.v1';

const STEPS: { id: string; label: string; icon: IconName }[] = [
  { id: 'client', label: 'Client', icon: 'user' },
  { id: 'project', label: 'Projet', icon: 'folder' },
  { id: 'audit', label: 'Audit', icon: 'boxes' },
  { id: 'quote', label: 'Devis', icon: 'fileText' },
  { id: 'sign', label: 'Signature', icon: 'edit' },
  { id: 'invoice', label: 'Acompte', icon: 'receipt' },
  { id: 'cloud', label: 'Cloud', icon: 'cloud' },
  { id: 'done', label: 'Terminé', icon: 'checkCircle' },
];

function blankState(): ParcoursState {
  return {
    step: 0,
    client: null,
    project: null,
    rooms: [],
    currentRoomId: null,
    quote: null,
    signature: null,
    invoice: null,
    instance: null,
  };
}

function loadState(): ParcoursState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...blankState(), ...(JSON.parse(raw) as Partial<ParcoursState>) };
  } catch {
    /* localStorage indisponible ou JSON corrompu : on repart à zéro */
  }
  return blankState();
}

const STEP_COMPONENTS: Record<string, (props: StepProps) => ReactElement> = {
  client: ClientStep,
  project: ProjectStep,
  audit: AuditStep,
  quote: QuoteStep,
  sign: SignStep,
  invoice: InvoiceStep,
  cloud: CloudStep,
  done: DoneStep,
};

export function ParcoursPage() {
  const [state, setState] = useState<ParcoursState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      /* quota dépassé ou mode privé : on ignore la persistance */
    }
  }, [state]);

  const patch = useCallback(
    (partial: Partial<ParcoursState>) => setState((s) => ({ ...s, ...partial })),
    []
  );
  const goTo = useCallback(
    (i: number) =>
      setState((s) => ({ ...s, step: Math.max(0, Math.min(STEPS.length - 1, i)) })),
    []
  );
  const next = useCallback(
    () => setState((s) => ({ ...s, step: Math.min(STEPS.length - 1, s.step + 1) })),
    []
  );
  const back = useCallback(
    () => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) })),
    []
  );
  const reset = useCallback(() => setState(blankState()), []);

  const current = STEPS[state.step];
  const StepComponent = STEP_COMPONENTS[current.id];
  const stepProps: StepProps = { state, patch, next, back, reset };

  return (
    <div className="parcours-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Parcours guidé</h1>
          <p>Le cycle de vie complet d'un projet, étape par étape : du client à la mise en service.</p>
        </div>
      </div>

      <div className="parcours-stepper" role="navigation">
        {STEPS.map((s, i) => {
          const status = i < state.step ? 'done' : i === state.step ? 'active' : 'todo';
          return (
            <button
              key={s.id}
              type="button"
              className={`parcours-step ${status}`}
              disabled={i > state.step}
              onClick={() => goTo(i)}
            >
              <span className="ps-num">
                {i < state.step ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <Icon name={s.icon} size={15} />
              <span className="ps-label">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="parcours-stage">
        <StepComponent {...stepProps} />
      </div>
    </div>
  );
}

export default ParcoursPage;
