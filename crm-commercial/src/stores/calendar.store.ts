import { create } from 'zustand';
import type { Appointment, AppointmentType, AppointmentStatus, AppointmentTypeConfig } from '../types/appointment.types';
import { appointmentsService } from '../services/appointments.service';

interface CalendarFilters {
  type?: AppointmentType;
  status?: AppointmentStatus;
  userId?: string;
}

interface CalendarState {
  appointments: Appointment[];
  selectedDate: Date;
  viewMode: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
  isLoading: boolean;
  filters: CalendarFilters;
  typeConfigs: AppointmentTypeConfig[];

  // Actions
  loadAppointments: (fromDate: string, toDate: string) => Promise<void>;
  setViewMode: (mode: CalendarState['viewMode']) => void;
  setSelectedDate: (date: Date) => void;
  setFilters: (filters: CalendarFilters) => void;
  loadTypeConfigs: () => Promise<void>;
  reset: () => void;
}

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  appointments: [],
  selectedDate: new Date(),
  viewMode: 'dayGridMonth',
  isLoading: false,
  filters: {},
  typeConfigs: [],

  loadAppointments: async (fromDate: string, toDate: string) => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const result = await appointmentsService.getAppointments({
        fromDate,
        toDate,
        type: filters.type,
        status: filters.status,
        userId: filters.userId,
      });
      // Handle both array and paginated response formats
      const appointments = Array.isArray(result) ? result : (result as unknown as { data: Appointment[] }).data || [];
      set({ appointments, isLoading: false });
    } catch (error) {
      console.error('Erreur lors du chargement des rendez-vous:', error);
      set({ appointments: [], isLoading: false });
    }
  },

  setViewMode: (viewMode) => set({ viewMode }),

  setSelectedDate: (selectedDate) => set({ selectedDate }),

  setFilters: (filters) => set({ filters }),

  loadTypeConfigs: async () => {
    try {
      const typeConfigs = await appointmentsService.getTypeConfigs();
      set({ typeConfigs });
    } catch (error) {
      console.error('Erreur lors du chargement des types:', error);
    }
  },

  reset: () =>
    set({
      appointments: [],
      selectedDate: new Date(),
      viewMode: 'dayGridMonth',
      isLoading: false,
      filters: {},
      typeConfigs: [],
    }),
}));

export default useCalendarStore;
