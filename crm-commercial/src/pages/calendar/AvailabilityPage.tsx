import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Btn, Card, Icon } from '../../components/neo';
import { appointmentsService } from '../../services/appointments.service';
import { useAuthStore } from '../../stores/auth.store';
import type { AvailabilitySlot, AvailabilityOverride, DayOfWeek } from '../../types/appointment.types';
import { DAY_OF_WEEK_LABELS } from '../../types/appointment.types';

const DAYS: DayOfWeek[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function slotKeyStr(day: DayOfWeek, time: string) {
  return `${day}-${time}`;
}

export function AvailabilityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSlots, setActiveSlots] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);

  // Override form
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideAvailable, setOverrideAvailable] = useState(false);
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('17:00');
  const [overrideReason, setOverrideReason] = useState('');
  const [addingOverride, setAddingOverride] = useState(false);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');

  const userId = user?.id || '';

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const availSlots = await appointmentsService.getAvailability(userId);

      // Build the active slots set from loaded data
      const active = new Set<string>();
      availSlots.forEach((slot) => {
        if (!slot.isActive) return;
        // Mark all 30-min increments between startTime and endTime
        const startH = parseInt(slot.startTime.split(':')[0]);
        const startM = parseInt(slot.startTime.split(':')[1]);
        const endH = parseInt(slot.endTime.split(':')[0]);
        const endM = parseInt(slot.endTime.split(':')[1]);

        let currentH = startH;
        let currentM = startM;

        while (currentH < endH || (currentH === endH && currentM < endM)) {
          const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;
          active.add(slotKeyStr(slot.dayOfWeek, timeStr));
          currentM += 30;
          if (currentM >= 60) {
            currentH += 1;
            currentM = 0;
          }
        }
      });
      setActiveSlots(active);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
      // Initialize empty if no data
      setActiveSlots(new Set());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadOverrides = useCallback(async () => {
    // The overrides are typically fetched as part of availability, but let's use a simulated approach
    // In a real implementation this would be a separate endpoint
    try {
      const availSlots = await appointmentsService.getAvailability(userId);
      // For overrides, we filter or do a separate call - here we just store empty if not available
      void availSlots;
    } catch {
      // Silently ignore
    }
  }, [userId]);

  useEffect(() => {
    loadData();
    loadOverrides();
  }, [loadData, loadOverrides]);

  const toggleSlot = (day: DayOfWeek, time: string) => {
    setActiveSlots((prev) => {
      const key = slotKeyStr(day, time);
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleMouseDown = (day: DayOfWeek, time: string) => {
    const key = slotKeyStr(day, time);
    const isActive = activeSlots.has(key);
    setIsDragging(true);
    setDragMode(isActive ? 'remove' : 'add');
    toggleSlot(day, time);
  };

  const handleMouseEnter = (day: DayOfWeek, time: string) => {
    if (!isDragging) return;
    const key = slotKeyStr(day, time);
    setActiveSlots((prev) => {
      const next = new Set(prev);
      if (dragMode === 'add') {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const isNextSlot = (time1: string, time2: string): boolean => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    const minutes1 = h1 * 60 + m1;
    const minutes2 = h2 * 60 + m2;
    return minutes2 - minutes1 === 30;
  };

  const addThirtyMinutes = (time: string): string => {
    const [h, m] = time.split(':').map(Number);
    let newM = m + 30;
    let newH = h;
    if (newM >= 60) {
      newH += 1;
      newM = 0;
    }
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert activeSlots set back into AvailabilitySlot objects
      // Group consecutive times for each day into ranges
      const newSlots: AvailabilitySlot[] = [];

      DAYS.forEach((day) => {
        const dayTimes = TIME_SLOTS.filter((time) => activeSlots.has(slotKeyStr(day, time))).sort();

        if (dayTimes.length === 0) return;

        // Group consecutive times into ranges
        let rangeStart = dayTimes[0];
        let prevTime = dayTimes[0];

        for (let i = 1; i <= dayTimes.length; i++) {
          const currTime = dayTimes[i];
          const isConsecutive = currTime && isNextSlot(prevTime, currTime);

          if (!isConsecutive) {
            // End this range
            const endTime = addThirtyMinutes(prevTime);
            newSlots.push({
              id: `${day}-${rangeStart}`,
              userId,
              dayOfWeek: day,
              startTime: rangeStart,
              endTime,
              isActive: true,
            });

            if (currTime) {
              rangeStart = currTime;
            }
          }

          if (currTime) {
            prevTime = currTime;
          }
        }
      });

      await appointmentsService.setAvailability(newSlots);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = async () => {
    if (!overrideDate) return;
    setAddingOverride(true);
    try {
      const newOverride = await appointmentsService.addAvailabilityOverride({
        userId,
        date: overrideDate,
        isAvailable: overrideAvailable,
        startTime: overrideAvailable ? overrideStartTime : undefined,
        endTime: overrideAvailable ? overrideEndTime : undefined,
        reason: overrideReason || undefined,
      });
      setOverrides((prev) => [...prev, newOverride]);
      setOverrideDate('');
      setOverrideReason('');
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'exception:", error);
    } finally {
      setAddingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    try {
      await appointmentsService.deleteAvailabilityOverride(overrideId);
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const setPreset = (preset: 'weekdays' | 'fullweek' | 'clear') => {
    const next = new Set<string>();

    if (preset === 'clear') {
      setActiveSlots(next);
      return;
    }

    const days =
      preset === 'weekdays'
        ? (['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as DayOfWeek[])
        : DAYS;

    days.forEach((day) => {
      // Set 9:00-12:00 and 14:00-18:00
      for (let h = 9; h < 12; h++) {
        next.add(slotKeyStr(day, `${String(h).padStart(2, '0')}:00`));
        next.add(slotKeyStr(day, `${String(h).padStart(2, '0')}:30`));
      }
      for (let h = 14; h < 18; h++) {
        next.add(slotKeyStr(day, `${String(h).padStart(2, '0')}:00`));
        next.add(slotKeyStr(day, `${String(h).padStart(2, '0')}:30`));
      }
    });

    setActiveSlots(next);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="availability-page">
      <div className="page-head">
        <div className="ph-l">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <Icon name="arrowLeft" size={15} />
            Retour à l'agenda
          </button>
          <h1>Mes disponibilités</h1>
          <p>Définissez vos créneaux récurrents et vos exceptions</p>
        </div>
        <div className="page-actions">
          <Btn icon="check" disabled={saving} onClick={handleSave}>
            Enregistrer
          </Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }}>
        <Card
          head="Plage horaire hebdomadaire"
          icon="clock"
          action={
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" size="sm" onClick={() => setPreset('weekdays')}>
                Semaine standard
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setPreset('fullweek')}>
                Complète
              </Btn>
              <Btn variant="danger-ghost" size="sm" onClick={() => setPreset('clear')}>
                Effacer
              </Btn>
            </div>
          }
          flush
        >
          <p className="t-sub" style={{ fontSize: 12.5, padding: '12px 16px 4px', margin: 0 }}>
            <Icon name="help" size={13} /> Cliquez et glissez pour sélectionner vos créneaux de disponibilité.
          </p>
          <div style={{ userSelect: 'none', padding: '4px 16px 16px' }}>
            <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 54, fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textAlign: 'center' }}>Heure</th>
                  {DAYS.map((day) => (
                    <th key={day} style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '4px 0', color: 'var(--ink-2)' }}>
                      {DAY_OF_WEEK_LABELS[day].substring(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time) => (
                  <tr key={time}>
                    <td
                      style={{
                        fontSize: 10.5,
                        padding: '2px 4px',
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        color: 'var(--ink-4)',
                      }}
                    >
                      {time.endsWith(':00') ? time : ''}
                    </td>
                    {DAYS.map((day) => {
                      const key = slotKeyStr(day, time);
                      const isActive = activeSlots.has(key);
                      return (
                        <td
                          key={key}
                          onMouseDown={() => handleMouseDown(day, time)}
                          onMouseEnter={() => handleMouseEnter(day, time)}
                          style={{
                            padding: 0,
                            height: 20,
                            cursor: 'pointer',
                            background: isActive ? 'var(--komun)' : 'transparent',
                            opacity: isActive ? 0.85 : 1,
                            transition: 'background-color 0.1s',
                            border: '1px solid var(--line)',
                            borderBottom: time.endsWith(':00') ? '1px solid var(--line-2)' : '1px solid var(--line)',
                          }}
                        ></td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card head="Résumé" icon="chart">
            {DAYS.map((day) => {
              const daySlots = TIME_SLOTS.filter((t) => activeSlots.has(slotKeyStr(day, t)));
              const hoursCount = daySlots.length * 0.5;
              return (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                  <span style={{ color: daySlots.length ? 'var(--ink)' : 'var(--ink-4)', fontWeight: daySlots.length ? 500 : 400 }}>
                    {DAY_OF_WEEK_LABELS[day].substring(0, 3)}
                  </span>
                  <span style={{ color: daySlots.length ? 'var(--komun)' : 'var(--ink-4)', fontWeight: 500 }}>
                    {daySlots.length ? `${hoursCount}h` : '—'}
                  </span>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 600 }}>
              <span>Total</span>
              <span style={{ color: 'var(--komun)' }}>{(Array.from(activeSlots).length * 0.5).toFixed(1)}h / semaine</span>
            </div>
          </Card>

          <Card head="Exceptions" icon="calendar">
            <p className="t-sub" style={{ fontSize: 12.5, marginTop: 0, marginBottom: 14 }}>
              Ajoutez des exceptions pour des jours spécifiques (congés, indisponibilités ponctuelles).
            </p>

            <div className="field-label">Date</div>
            <input
              type="date"
              className="neo-field"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={overrideAvailable}
                onChange={(e) => setOverrideAvailable(e.target.checked)}
                style={{ accentColor: 'var(--komun)', margin: 0 }}
              />
              {overrideAvailable ? 'Disponible (horaire spécifique)' : 'Indisponible'}
            </label>

            {overrideAvailable && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <div className="field-label">De</div>
                  <input type="time" className="neo-field" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} />
                </div>
                <div>
                  <div className="field-label">À</div>
                  <input type="time" className="neo-field" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} />
                </div>
              </div>
            )}

            <div className="field-label" style={{ marginTop: 8 }}>Raison (optionnel)</div>
            <input
              type="text"
              className="neo-field"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Ex: Congé, Formation..."
            />

            <Btn
              variant="ghost"
              icon="plus"
              size="sm"
              onClick={handleAddOverride}
              disabled={!overrideDate || addingOverride}
              style={{ width: '100%', marginTop: 12, marginBottom: 14 }}
            >
              Ajouter une exception
            </Btn>

            {overrides.length > 0 ? (
              <div>
                <div className="field-label">Exceptions existantes</div>
                {overrides.map((override) => (
                  <div
                    key={override.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 8,
                      borderRadius: 8,
                      marginBottom: 5,
                      background: 'var(--paper-2)',
                      fontSize: 12.5,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {new Date(override.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="t-sub" style={{ fontSize: 11.5 }}>
                        {override.isAvailable ? `${override.startTime} - ${override.endTime}` : 'Indisponible'}
                        {override.reason && ` - ${override.reason}`}
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => handleDeleteOverride(override.id)}
                      aria-label="Supprimer"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="t-sub" style={{ textAlign: 'center', fontSize: 12.5, padding: '8px 0' }}>
                Aucune exception
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityPage;
