import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventInput, DatesSetArg, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { Card, CardBody, CardHeader, Button, Spinner } from '../../components';
import { useCalendarStore } from '../../stores/calendar.store';
import type { AppointmentType, AppointmentStatus } from '../../types/appointment.types';
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPE_COLORS,
  APPOINTMENT_TYPE_ICONS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
} from '../../types/appointment.types';

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

  const [sidebarOpen, setSidebarOpen] = useState(true);
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
      <div className="d-flex align-items-center gap-1 w-100 overflow-hidden" style={{ fontSize: '0.8rem', padding: '1px 3px' }}>
        <i className={`bi ${APPOINTMENT_TYPE_ICONS[appointment.type]}`} style={{ fontSize: '0.7rem' }}></i>
        <span
          className="d-inline-block rounded-circle flex-shrink-0"
          style={{
            width: 6,
            height: 6,
            backgroundColor: APPOINTMENT_STATUS_COLORS[appointment.status],
          }}
        ></span>
        <span className="text-truncate">
          {eventInfo.timeText && <b className="me-1">{eventInfo.timeText}</b>}
          {eventInfo.event.title}
        </span>
      </div>
    );
  };

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <h2 className="mb-0" style={{ fontWeight: 600 }}>
            <i className="bi bi-calendar3 me-2"></i>
            Agenda
          </h2>
          <button
            className="btn btn-sm btn-outline-secondary d-lg-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i className="bi bi-funnel"></i>
          </button>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* View Mode Buttons */}
          <div className="btn-group">
            <button
              className={`btn btn-sm ${viewMode === 'dayGridMonth' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleViewChange('dayGridMonth')}
            >
              Mois
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'timeGridWeek' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleViewChange('timeGridWeek')}
            >
              Semaine
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'timeGridDay' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleViewChange('timeGridDay')}
            >
              Jour
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'listWeek' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleViewChange('listWeek')}
            >
              Liste
            </button>
          </div>

          <Button icon="bi-plus-lg" onClick={() => navigate('/calendar/new')}>
            Nouveau RDV
          </Button>
        </div>
      </div>

      <div className="row g-4">
        {/* Sidebar */}
        <div className={`col-lg-3 ${sidebarOpen ? '' : 'd-none d-lg-block'}`}>
          {/* Mini Stats */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <Card>
                <CardBody className="p-3 text-center">
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--neo-primary)' }}>
                    {appointmentsToday.length}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Aujourd'hui
                  </div>
                </CardBody>
              </Card>
            </div>
            <div className="col-6">
              <Card>
                <CardBody className="p-3 text-center">
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--neo-success, #198754)' }}>
                    {appointmentsThisWeek.length}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Cette semaine
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Type Filters */}
          <Card className="mb-3">
            <CardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Types</span>
                {typeFilters.size > 0 && (
                  <button
                    className="btn btn-link btn-sm text-muted p-0"
                    onClick={() => setTypeFilters(new Set())}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Tout afficher
                  </button>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-2">
              {allTypes.map((type) => (
                <label
                  key={type}
                  className="d-flex align-items-center gap-2 px-2 py-1 rounded"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    backgroundColor: typeFilters.has(type) ? 'var(--neo-primary-light)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    className="form-check-input m-0"
                    checked={typeFilters.size === 0 || typeFilters.has(type)}
                    onChange={() => toggleTypeFilter(type)}
                    style={{
                      borderColor: APPOINTMENT_TYPE_COLORS[type],
                      backgroundColor: (typeFilters.size === 0 || typeFilters.has(type)) ? APPOINTMENT_TYPE_COLORS[type] : 'transparent',
                    }}
                  />
                  <i className={`bi ${APPOINTMENT_TYPE_ICONS[type]}`} style={{ color: APPOINTMENT_TYPE_COLORS[type], fontSize: '0.9rem' }}></i>
                  <span>{APPOINTMENT_TYPE_LABELS[type]}</span>
                </label>
              ))}
            </CardBody>
          </Card>

          {/* Status Filter */}
          <Card className="mb-3">
            <CardHeader>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Statut</span>
            </CardHeader>
            <CardBody className="p-2">
              <select
                className="form-select form-select-sm"
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
            </CardBody>
          </Card>

          {/* Availability Link */}
          <Card>
            <CardBody className="p-3">
              <button
                className="btn btn-outline-primary btn-sm w-100"
                onClick={() => navigate('/calendar/availability')}
              >
                <i className="bi bi-clock me-2"></i>
                Gérer mes disponibilités
              </button>
            </CardBody>
          </Card>
        </div>

        {/* Calendar Main Area */}
        <div className={`${sidebarOpen ? 'col-lg-9' : 'col-12'}`}>
          <Card>
            <CardBody>
              {isLoading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 10, background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }}>
                  <Spinner />
                </div>
              )}
              <div style={{ position: 'relative', minHeight: '600px' }}>
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
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CalendarPage;
