import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Btn, Card } from '../../components/neo';
import { Spinner } from '../../components';
import { appointmentsService } from '../../services/appointments.service';
import { usersService } from '../../services/users.service';
import type { StaffUser } from '../../types';
import type { DayOfWeek } from '../../types/appointment.types';
import { DAY_OF_WEEK_LABELS } from '../../types/appointment.types';

const DAYS: DayOfWeek[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

interface SlotRow {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

const BLANK_ROW: SlotRow = { dayOfWeek: 'lundi', startTime: '09:00', endTime: '18:00' };

export function CreneauxPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rows, setRows] = useState<SlotRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersService
      .getUsers(undefined, 1, 200)
      .then((res) => setUsers(res.data))
      .catch(() => toast.error('Chargement des collaborateurs impossible'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const loadSlots = useCallback(async (userId: string) => {
    setLoadingSlots(true);
    try {
      const slots = await appointmentsService.getUserAvailabilitySlots(userId);
      setRows(
        slots.length > 0
          ? slots.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }))
          : [{ ...BLANK_ROW }]
      );
    } catch {
      toast.error('Chargement des créneaux impossible');
      setRows([{ ...BLANK_ROW }]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const onSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setRows([]);
    if (userId) loadSlots(userId);
  };

  const setRow = (index: number, key: keyof SlotRow, value: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  const addRow = () => setRows((prev) => [...prev, { ...(prev[prev.length - 1] ?? BLANK_ROW) }]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const save = async () => {
    if (!selectedUserId) return;
    for (const r of rows) {
      if (r.startTime >= r.endTime) {
        toast.error('Chaque créneau doit avoir une fin postérieure au début');
        return;
      }
    }
    setSaving(true);
    try {
      await appointmentsService.setUserAvailability(
        selectedUserId,
        rows.map((r) => ({ ...r, isActive: true }))
      );
      toast.success('Créneaux enregistrés');
    } catch {
      toast.error('Enregistrement des créneaux impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loadingUsers) return <Spinner />;

  return (
    <div>
      <div className="page-head">
        <div className="ph-l">
          <h1>Créneaux de disponibilité</h1>
          <p>Définissez les plages hebdomadaires d'un collaborateur</p>
        </div>
      </div>

      <Card>
        <label className="field-label">Collaborateur</label>
        <select
          className="neo-field"
          value={selectedUserId}
          onChange={(e) => onSelectUser(e.target.value)}
        >
          <option value="">Sélectionner un collaborateur…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName} ({u.email})
            </option>
          ))}
        </select>
      </Card>

      {selectedUserId && (
        <Card
          head="Créneaux hebdomadaires"
          icon="clock"
          action={
            <Btn variant="ghost" size="sm" icon="plus" onClick={addRow} disabled={loadingSlots}>
              Ajouter
            </Btn>
          }
        >
          {loadingSlots ? (
            <Spinner />
          ) : (
            <>
              {rows.map((row, i) => (
                <div key={i} className="creneau-row">
                  <div>
                    <label className="field-label">Jour</label>
                    <select
                      className="neo-field"
                      value={row.dayOfWeek}
                      onChange={(e) => setRow(i, 'dayOfWeek', e.target.value)}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {DAY_OF_WEEK_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Début</label>
                    <input
                      type="time"
                      className="neo-field"
                      value={row.startTime}
                      onChange={(e) => setRow(i, 'startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Fin</label>
                    <input
                      type="time"
                      className="neo-field"
                      value={row.endTime}
                      onChange={(e) => setRow(i, 'endTime', e.target.value)}
                    />
                  </div>
                  <Btn
                    variant="danger-ghost"
                    size="sm"
                    icon="trash"
                    onClick={() => removeRow(i)}
                    disabled={rows.length <= 1}
                    aria-label="Supprimer"
                  />
                </div>
              ))}

              <div className="parcours-footnav">
                <span style={{ flex: 1 }} />
                <Btn variant="primary" icon="check" disabled={saving} onClick={save}>
                  Enregistrer les créneaux
                </Btn>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export default CreneauxPage;
