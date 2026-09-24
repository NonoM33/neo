import { useEffect, useState } from 'react';
import { Btn, Modal } from '../../components/neo';
import type { CreateObjectiveInput } from '../../services/kpis.service';

interface UserOption {
  id: string;
  label: string;
}

interface Props {
  open: boolean;
  users: UserOption[];
  defaultYear: number;
  onClose: () => void;
  onSubmit: (input: CreateObjectiveInput) => Promise<void>;
}

type PeriodType = 'annuel' | 'mensuel' | 'trimestriel';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function ObjectiveFormModal({ open, users, defaultYear, onClose, onSubmit }: Props) {
  const [userId, setUserId] = useState('');
  const [year, setYear] = useState(defaultYear);
  const [periodType, setPeriodType] = useState<PeriodType>('mensuel');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(1);
  const [revenueTarget, setRevenueTarget] = useState('');
  const [leadsTarget, setLeadsTarget] = useState('');
  const [conversionsTarget, setConversionsTarget] = useState('');
  const [activitiesTarget, setActivitiesTarget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUserId(users[0]?.id ?? '');
      setYear(defaultYear);
      setPeriodType('mensuel');
      setMonth(new Date().getMonth() + 1);
      setQuarter(1);
      setRevenueTarget('');
      setLeadsTarget('');
      setConversionsTarget('');
      setActivitiesTarget('');
    }
  }, [open, users, defaultYear]);

  const handleSubmit = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await onSubmit({
        userId,
        year,
        month: periodType === 'mensuel' ? month : undefined,
        quarter: periodType === 'trimestriel' ? quarter : undefined,
        revenueTarget: numberOrUndefined(revenueTarget),
        leadsTarget: numberOrUndefined(leadsTarget),
        conversionsTarget: numberOrUndefined(conversionsTarget),
        activitiesTarget: numberOrUndefined(activitiesTarget),
      });
    } finally {
      setSaving(false);
    }
  };

  const years = [defaultYear - 1, defaultYear, defaultYear + 1];

  return (
    <Modal
      open={open}
      title="Nouvel objectif"
      onClose={onClose}
      width={620}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Annuler
          </Btn>
          <Btn onClick={handleSubmit} disabled={saving || !userId}>
            Enregistrer
          </Btn>
        </>
      }
    >
      <div className="field-grid">
        <div>
          <div className="field-label">Commercial</div>
          <select className="neo-field" value={userId} onChange={(e) => setUserId(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Année</div>
          <select
            className="neo-field"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Type de période</div>
          <select
            className="neo-field"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
          >
            <option value="mensuel">Mensuel</option>
            <option value="trimestriel">Trimestriel</option>
            <option value="annuel">Annuel</option>
          </select>
        </div>
        <div>
          {periodType === 'mensuel' && (
            <>
              <div className="field-label">Mois</div>
              <select
                className="neo-field"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}
          {periodType === 'trimestriel' && (
            <>
              <div className="field-label">Trimestre</div>
              <select
                className="neo-field"
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    T{q}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">CA cible (€)</div>
          <input
            className="neo-field"
            type="number"
            min={0}
            value={revenueTarget}
            onChange={(e) => setRevenueTarget(e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Leads cible</div>
          <input
            className="neo-field"
            type="number"
            min={0}
            value={leadsTarget}
            onChange={(e) => setLeadsTarget(e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid" style={{ marginTop: 12 }}>
        <div>
          <div className="field-label">Conversions cible</div>
          <input
            className="neo-field"
            type="number"
            min={0}
            value={conversionsTarget}
            onChange={(e) => setConversionsTarget(e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">Activités cible</div>
          <input
            className="neo-field"
            type="number"
            min={0}
            value={activitiesTarget}
            onChange={(e) => setActivitiesTarget(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export default ObjectiveFormModal;
