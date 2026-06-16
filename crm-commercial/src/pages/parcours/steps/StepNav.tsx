import { Btn } from '../../../components/neo';

interface StepNavProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}

export function StepNav({ onBack, onNext, nextLabel = 'Continuer', nextDisabled }: StepNavProps) {
  return (
    <div className="parcours-footnav">
      {onBack && (
        <Btn variant="subtle" icon="arrowLeft" onClick={onBack}>
          Retour
        </Btn>
      )}
      <span style={{ flex: 1 }} />
      {onNext && (
        <Btn variant="primary" iconRight="arrowRight" disabled={nextDisabled} onClick={onNext}>
          {nextLabel}
        </Btn>
      )}
    </div>
  );
}
