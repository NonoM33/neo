import { useEffect, useState } from 'react';
import { Btn, Modal } from '../../components/neo';
import type {
  CreateRecetteFeedbackInput,
  RecetteSeverity,
} from '../../types/recette.types';
import { SEVERITY_META } from './recette.meta';

interface Props {
  open: boolean;
  featureTitle: string;
  onClose: () => void;
  onSubmit: (input: Omit<CreateRecetteFeedbackInput, 'featureId'>) => Promise<void>;
}

function trimmedOrUndefined(value: string): string | undefined {
  const t = value.trim();
  return t === '' ? undefined : t;
}

export function FeedbackFormModal({ open, featureTitle, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<RecetteSeverity>('majeur');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setSeverity('majeur');
      setStepsToReproduce('');
      setExpectedResult('');
      setActualResult('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        severity,
        stepsToReproduce: trimmedOrUndefined(stepsToReproduce),
        expectedResult: trimmedOrUndefined(expectedResult),
        actualResult: trimmedOrUndefined(actualResult),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Nouveau retour — ${featureTitle}`}
      onClose={onClose}
      width={620}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Annuler
          </Btn>
          <Btn onClick={handleSubmit} disabled={saving || !title.trim()}>
            Enregistrer
          </Btn>
        </>
      }
    >
      <div>
        <div className="field-label">Titre</div>
        <input
          className="neo-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Résumé du problème"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="field-label">Sévérité</div>
        <select
          className="neo-field"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as RecetteSeverity)}
        >
          {(Object.keys(SEVERITY_META) as RecetteSeverity[]).map((s) => (
            <option key={s} value={s}>
              {SEVERITY_META[s].label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="field-label">Étapes de reproduction</div>
        <textarea
          className="neo-field"
          rows={3}
          value={stepsToReproduce}
          onChange={(e) => setStepsToReproduce(e.target.value)}
        />
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Résultat attendu</div>
          <textarea
            className="neo-field"
            rows={3}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Résultat constaté</div>
          <textarea
            className="neo-field"
            rows={3}
            value={actualResult}
            onChange={(e) => setActualResult(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export default FeedbackFormModal;
