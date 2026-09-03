import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Icon } from '../../components/neo';
import { kpisService, usersService } from '../../services';
import type { CreateObjectiveInput } from '../../services/kpis.service';
import type { ObjectiveWithProgress, SalesObjective } from '../../types';
import { ObjectiveFormModal } from './ObjectiveFormModal';

const MONTHS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function periodLabel(o: SalesObjective): string {
  if (o.month) return `${MONTHS[o.month]} ${o.year}`;
  if (o.quarter) return `T${o.quarter} ${o.year}`;
  return `Année ${o.year}`;
}

interface MetricBarProps {
  label: string;
  actual: number;
  target: number | null;
  percentage: number | null;
  color: string;
  isCurrency?: boolean;
}

function MetricBar({ label, actual, target, percentage, color, isCurrency }: MetricBarProps) {
  if (target === null || target === undefined) return null;
  const pct = Math.min(percentage ?? 0, 100);
  const fmt = (n: number) => (isCurrency ? euro.format(n) : String(n));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--ink-2)' }}>{label}</span>
        <span className="t-mono">
          {fmt(actual)} / {fmt(target)} ({percentage ?? 0}%)
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export function ObjectivesPage() {
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(currentYear);
  const [objectives, setObjectives] = useState<SalesObjective[]>([]);
  const [progress, setProgress] = useState<Record<string, ObjectiveWithProgress>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userOptions, setUserOptions] = useState<{ id: string; label: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadObjectives = async (selectedYear: number) => {
    const list = await kpisService.listObjectives({ year: selectedYear });
    setObjectives(list);
    const entries = await Promise.all(
      list.map(async (o) => {
        try {
          return [o.id, await kpisService.getObjectiveProgress(o.id)] as const;
        } catch {
          return null;
        }
      })
    );
    const map: Record<string, ObjectiveWithProgress> = {};
    for (const entry of entries) {
      if (entry) map[entry[0]] = entry[1];
    }
    setProgress(map);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersResult] = await Promise.all([usersService.getUsers(undefined, 1, 100)]);
        if (cancelled) return;
        const names: Record<string, string> = {};
        const options = usersResult.data.map((u) => {
          const label = `${u.firstName} ${u.lastName}`.trim() || u.email;
          names[u.id] = label;
          return { id: u.id, label };
        });
        setUserNames(names);
        setUserOptions(options);
        await loadObjectives(currentYear);
      } catch (error) {
        console.error('Failed to load objectives:', error);
        toast.error('Impossible de charger les objectifs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentYear]);

  const changeYear = async (newYear: number) => {
    setYear(newYear);
    try {
      await loadObjectives(newYear);
    } catch {
      toast.error('Impossible de charger les objectifs');
    }
  };

  const handleCreate = async (input: CreateObjectiveInput) => {
    try {
      await kpisService.createObjective(input);
      setModalOpen(false);
      toast.success('Objectif enregistré');
      await loadObjectives(year);
    } catch {
      toast.error("Échec de l'enregistrement");
    }
  };

  const handleDelete = async (o: SalesObjective) => {
    if (!window.confirm('Supprimer cet objectif ?')) return;
    try {
      await kpisService.deleteObjective(o.id);
      toast.success('Objectif supprimé');
      await loadObjectives(year);
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  const totals = useMemo(() => {
    return objectives.reduce(
      (acc, o) => ({
        revenue: acc.revenue + (o.revenueTarget ? parseFloat(o.revenueTarget) : 0),
        leads: acc.leads + (o.leadsTarget ?? 0),
        conversions: acc.conversions + (o.conversionsTarget ?? 0),
      }),
      { revenue: 0, leads: 0, conversions: 0 }
    );
  }, [objectives]);

  if (loading) return <Spinner />;

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="objectives-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Objectifs commerciaux</h1>
          <p>Définissez les cibles par commercial et suivez la progression en temps réel.</p>
        </div>
        <div className="page-actions">
          <select
            className="neo-field"
            value={year}
            onChange={(e) => changeYear(Number(e.target.value))}
            style={{ width: 120 }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Btn icon="plus" onClick={() => setModalOpen(true)}>
            Nouvel objectif
          </Btn>
        </div>
      </div>

      <div className="stat-grid mb-22">
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Objectifs définis</span>
          </div>
          <div className="st-val">{objectives.length}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">CA cible total</span>
          </div>
          <div className="st-val">{euro.format(totals.revenue)}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Leads cible total</span>
          </div>
          <div className="st-val">{totals.leads}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Conversions cible</span>
          </div>
          <div className="st-val">{totals.conversions}</div>
        </div>
      </div>

      {objectives.length === 0 ? (
        <Card head="Aucun objectif" icon="target">
          <div className="empty">Aucun objectif défini pour {year}.</div>
        </Card>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {objectives.map((o) => {
            const prog = progress[o.id];
            return (
              <Card key={o.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Icon name="user" size={16} />
                  <strong style={{ flex: 1 }}>{userNames[o.userId] ?? 'Commercial'}</strong>
                  <span className="t-sub">{periodLabel(o)}</span>
                  <Btn
                    variant="danger-ghost"
                    size="sm"
                    icon="trash"
                    onClick={() => handleDelete(o)}
                  />
                </div>
                {prog ? (
                  <>
                    <MetricBar
                      label="Chiffre d'affaires"
                      actual={prog.progress.revenue.actual}
                      target={prog.progress.revenue.target}
                      percentage={prog.progress.revenue.percentage}
                      color="var(--success)"
                      isCurrency
                    />
                    <MetricBar
                      label="Leads"
                      actual={prog.progress.leads.actual}
                      target={prog.progress.leads.target}
                      percentage={prog.progress.leads.percentage}
                      color="var(--komun)"
                    />
                    <MetricBar
                      label="Conversions"
                      actual={prog.progress.conversions.actual}
                      target={prog.progress.conversions.target}
                      percentage={prog.progress.conversions.percentage}
                      color="var(--warning)"
                    />
                    <MetricBar
                      label="Activités"
                      actual={prog.progress.activities.actual}
                      target={prog.progress.activities.target}
                      percentage={prog.progress.activities.percentage}
                      color="var(--ochre)"
                    />
                  </>
                ) : (
                  <div className="t-sub">Aucune cible chiffrée.</div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ObjectiveFormModal
        open={modalOpen}
        users={userOptions}
        defaultYear={year}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}

export default ObjectivesPage;
