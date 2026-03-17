import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Spinner, Button } from '../../components';
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

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
      console.error('Erreur lors de l\'ajout de l\'exception:', error);
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

    const days = preset === 'weekdays'
      ? ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as DayOfWeek[]
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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button className="btn btn-link text-muted p-0 mb-2" onClick={() => navigate('/calendar')}>
            <i className="bi bi-arrow-left me-1"></i>
            Retour à l'agenda
          </button>
          <h2 className="mb-0" style={{ fontWeight: 600 }}>
            <i className="bi bi-clock me-2"></i>
            Mes disponibilités
          </h2>
        </div>
        <Button icon="bi-check-lg" loading={saving} onClick={handleSave}>
          Enregistrer
        </Button>
      </div>

      <div className="row g-4">
        {/* Weekly Grid */}
        <div className="col-lg-9">
          <Card>
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span>Plage horaire hebdomadaire</span>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPreset('weekdays')}
                  >
                    Semaine standard
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPreset('fullweek')}
                  >
                    Semaine complète
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => setPreset('clear')}
                  >
                    Tout effacer
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <p className="text-muted px-3 pt-3 mb-2" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-info-circle me-1"></i>
                Cliquez et glissez pour sélectionner vos créneaux de disponibilité.
              </p>
              <div className="table-responsive" style={{ userSelect: 'none' }}>
                <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px', fontSize: '0.75rem' }} className="text-center text-muted">Heure</th>
                      {DAYS.map((day) => (
                        <th key={day} className="text-center" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {DAY_OF_WEEK_LABELS[day].substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((time) => (
                      <tr key={time}>
                        <td
                          className="text-center text-muted"
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 4px',
                            verticalAlign: 'middle',
                            backgroundColor: 'var(--neo-bg-light)',
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
                                height: '20px',
                                cursor: 'pointer',
                                backgroundColor: isActive ? 'var(--neo-primary)' : 'transparent',
                                opacity: isActive ? 0.8 : 1,
                                transition: 'background-color 0.1s',
                                borderBottom: time.endsWith(':00') ? '1px solid var(--neo-border-color)' : '1px solid rgba(0,0,0,0.03)',
                              }}
                            ></td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar: Overrides & Summary */}
        <div className="col-lg-3">
          {/* Summary */}
          <Card className="mb-4">
            <CardHeader>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Résumé</span>
            </CardHeader>
            <CardBody>
              {DAYS.map((day) => {
                const daySlots = TIME_SLOTS.filter((t) => activeSlots.has(slotKeyStr(day, t)));
                if (daySlots.length === 0) {
                  return (
                    <div key={day} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                      <span className="text-muted">{DAY_OF_WEEK_LABELS[day].substring(0, 3)}</span>
                      <span className="text-muted">-</span>
                    </div>
                  );
                }
                const hoursCount = daySlots.length * 0.5;
                return (
                  <div key={day} className="d-flex justify-content-between mb-1" style={{ fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 500 }}>{DAY_OF_WEEK_LABELS[day].substring(0, 3)}</span>
                    <span className="text-primary" style={{ fontWeight: 500 }}>{hoursCount}h</span>
                  </div>
                );
              })}
              <hr className="my-2" />
              <div className="d-flex justify-content-between" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                <span>Total</span>
                <span className="text-primary">
                  {(Array.from(activeSlots).length * 0.5).toFixed(1)}h / semaine
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Exceptions */}
          <Card>
            <CardHeader>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Exceptions</span>
            </CardHeader>
            <CardBody>
              <p className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>
                Ajoutez des exceptions pour des jours spécifiques (congés, indisponibilités ponctuelles).
              </p>

              <div className="mb-2">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                />
              </div>

              <div className="mb-2">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="overrideAvailable"
                    checked={overrideAvailable}
                    onChange={(e) => setOverrideAvailable(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="overrideAvailable" style={{ fontSize: '0.8rem' }}>
                    {overrideAvailable ? 'Disponible (horaire spécifique)' : 'Indisponible'}
                  </label>
                </div>
              </div>

              {overrideAvailable && (
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>De</label>
                    <input
                      type="time"
                      className="form-control form-control-sm"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>À</label>
                    <input
                      type="time"
                      className="form-control form-control-sm"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="mb-2">
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Raison (optionnel)</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Ex: Congé, Formation..."
                />
              </div>

              <button
                className="btn btn-sm btn-outline-primary w-100 mb-3"
                onClick={handleAddOverride}
                disabled={!overrideDate || addingOverride}
              >
                {addingOverride ? (
                  <span className="spinner-border spinner-border-sm me-1"></span>
                ) : (
                  <i className="bi bi-plus-lg me-1"></i>
                )}
                Ajouter une exception
              </button>

              {/* Existing Overrides */}
              {overrides.length > 0 && (
                <div>
                  <div className="text-muted small mb-2" style={{ fontWeight: 600 }}>Exceptions existantes</div>
                  {overrides.map((override) => (
                    <div
                      key={override.id}
                      className="d-flex justify-content-between align-items-center p-2 rounded mb-1"
                      style={{ backgroundColor: 'var(--neo-bg-light)', fontSize: '0.8rem' }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {new Date(override.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {override.isAvailable
                            ? `${override.startTime} - ${override.endTime}`
                            : 'Indisponible'}
                          {override.reason && ` - ${override.reason}`}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm btn-link text-danger p-0"
                        onClick={() => handleDeleteOverride(override.id)}
                        title="Supprimer"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {overrides.length === 0 && (
                <div className="text-center text-muted py-2" style={{ fontSize: '0.8rem' }}>
                  <i className="bi bi-calendar-x d-block mb-1"></i>
                  Aucune exception
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AvailabilityPage;
