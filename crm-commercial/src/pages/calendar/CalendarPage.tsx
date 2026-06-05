import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput, DatesSetArg, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { Spinner } from '../../components';
import { Btn, Card } from '../../components/neo';
import { useCalendarStore } from '../../stores/calendar.store';
import type { AppointmentType, AppointmentStatus } from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from '../../types/appointment.types';

const VIEW_MODES: { mode: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'; label: string }[] = [
  { mode: 'dayGridMonth', label: 'Mois' },
  { mode: 'timeGridWeek', label: 'Semaine' },
  { mode: 'timeGridDay', label: 'Jour' },
  { mode: 'listWeek', label: 'Liste' },
];

export function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const {
    appointments,
    viewMode,
    isLoading,
    filters,
    loadAppointments,
    setViewMode,
    setSelectedDate,
    setFilters,
  } = useCalendarStore();

  const [typeFilters, setTypeFilters] = useState<Set<AppointmentType>>(new Set());
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');

  const allTypes: AppointmentType[] = [
    'visite_technique', 'audit', 'rdv_commercial', 'installation', 'sav', 'reunion_interne', 'autre',
  ];

  // Compute stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  weekEnd.setHours(23, 59, 59, 999);

  const appointmentsToday = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    return d >= today && d <= todayEnd;
  });

  const appointmentsThisWeek = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    return d >= today && d <= weekEnd;
  });

  const handleDatesSet = useCallback(
    (dateInfo: DatesSetArg) => {
      const fromDate = dateInfo.startStr.split('T')[0];
      const toDate = dateInfo.endStr.split('T')[0];
      loadAppointments(fromDate, toDate);
    },
    [loadAppointments]
  );

  useEffect(() => {
    // Apply type and status filters to the store
    setFilters({
      ...filters,
      type: typeFilters.size === 1 ? Array.from(typeFilters)[0] : undefined,
      status: statusFilter || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilters, statusFilter]);

  // When filters change, reload using current calendar range
  useEffect(() => {
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      const start = calApi.view.activeStart;
      const end = calApi.view.activeEnd;
      const fromDate = start.toISOString().split('T')[0];
      const toDate = end.toISOString().split('T')[0];
      loadAppointments(fromDate, toDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const appointmentId = clickInfo.event.id;
    navigate(`/calendar/${appointmentId}`);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const scheduledAt = selectInfo.startStr;
    navigate(`/calendar/new?date=${encodeURIComponent(scheduledAt)}`);
  };

  const handleViewChange = (mode: typeof viewMode) => {
    setViewMode(mode);
    const calApi = calendarRef.current?.getApi();
    if (calApi) {
      calApi.changeView(mode);
    }
  };

  const toggleTypeFilter = (type: AppointmentType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Map appointments to FullCalendar events, applying client-side type filtering
  const events: EventInput[] = appointments
    .filter((a) => {
      if (typeFilters.size > 0 && !typeFilters.has(a.type)) return false;
      return true;
    })
    .map((appointment) => ({
      id: appointment.id,
      title: appointment.title,
      start: appointment.scheduledAt,
      end: appointment.endAt,
      color: APPOINTMENT_TYPE_COLORS[appointment.type],
      borderColor: APPOINTMENT_STATUS_COLORS[appointment.status],
      textColor: '#ffffff',
      extendedProps: { ...appointment },
    }));

  const renderEventContent = (eventInfo: { event: { title: string; extendedProps: Record<string, unknown> }; timeText: string }) => {
    const appointment = eventInfo.event.extendedProps as unknown as {
      type: AppointmentType;
      status: AppointmentStatus;
    };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', overflow: 'hidden', fontSize: '0.8rem', padding: '1px 3px' }}>
        <span
          style={{
            width: 6,
            height: 6,
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: APPOINTMENT_STATUS_COLORS[appointment.status],
          }}
        ></span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {eventInfo.timeText && <b style={{ marginRight: 4 }}>{eventInfo.timeText}</b>}
          {eventInfo.event.title}
        </span>
      </div>
    );
  };

  return (
    <div className="calendar-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Agenda</h1>
          <p>Rendez-vous, visites et interventions</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="seg">
            {VIEW_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                className={viewMode === mode ? 'on' : ''}
                onClick={() => handleViewChange(mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <Btn icon="plus" onClick={() => navigate('/calendar/new')}>
            Nouveau RDV
          </Btn>
        </div>
      </div>

      <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="stat">
              <div className="st-val" style={{ color: 'var(--komun)' }}>{appointmentsToday.length}</div>
              <div className="st-label">Aujourd'hui</div>
            </div>
            <div className="stat">
              <div className="st-val" style={{ color: 'var(--success)' }}>{appointmentsThisWeek.length}</div>
              <div className="st-label">Cette semaine</div>
            </div>
          </div>

          <Card
            head="Types"
            action={
              typeFilters.size > 0 ? (
                <button
                  className="link-btn"
                  onClick={() => setTypeFilters(new Set())}
                  style={{ background: 'none', border: 'none', color: 'var(--komun)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  Tout afficher
                </button>
              ) : undefined
            }
            flush
          >
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allTypes.map((type) => {
                const active = typeFilters.size === 0 || typeFilters.has(type);
                return (
                  <label
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 9px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13.5,
                      background: typeFilters.has(type) ? 'var(--komun-soft)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTypeFilter(type)}
                      style={{ accentColor: APPOINTMENT_TYPE_COLORS[type], margin: 0 }}
                    />
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        backgroundColor: APPOINTMENT_TYPE_COLORS[type],
                        flexShrink: 0,
                      }}
                    />
                    <span>{APPOINTMENT_TYPE_LABELS[type]}</span>
                  </label>
                );
              })}
            </div>
          </Card>

          <Card head="Statut" flush>
            <div style={{ padding: 12 }}>
              <select
                className="neo-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
              >
                <option value="">Tous les statuts</option>
                {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {APPOINTMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Btn variant="subtle" icon="clock" onClick={() => navigate('/calendar/availability')} style={{ width: '100%' }}>
            Gérer mes disponibilités
          </Btn>
        </div>

        <Card flush>
          <div style={{ position: 'relative', minHeight: 600, padding: 16 }}>
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(250,249,246,0.7)',
                  borderRadius: 12,
                }}
              >
                <Spinner />
              </div>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={viewMode}
              locale="fr"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              buttonText={{
                today: "Aujourd'hui",
                month: 'Mois',
                week: 'Semaine',
                day: 'Jour',
                list: 'Liste',
              }}
              events={events}
              eventContent={renderEventContent}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              datesSet={handleDatesSet}
              eventClick={handleEventClick}
              select={handleDateSelect}
              height="auto"
              slotMinTime="07:00:00"
              slotMaxTime="21:00:00"
              slotDuration="00:30:00"
              allDaySlot={false}
              nowIndicator={true}
              firstDay={1}
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              dateClick={(info) => {
                setSelectedDate(info.date);
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CalendarPage;
