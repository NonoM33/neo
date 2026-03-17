import api from './api';
import type {
  Appointment,
  AppointmentFilter,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentKPIs,
  AppointmentTypeConfig,
  AvailabilitySlot,
  AvailabilityOverride,
  ParticipantRole,
  ParticipantResponseStatus,
  AppointmentParticipant,
} from '../types/appointment.types';

export interface AvailableSlot {
  start: string;
  end: string;
}

export const appointmentsService = {
  async getAppointments(filter: AppointmentFilter): Promise<Appointment[]> {
    const params = new URLSearchParams();
    params.append('fromDate', filter.fromDate);
    params.append('toDate', filter.toDate);

    if (filter.type) params.append('type', filter.type);
    if (filter.status) params.append('status', filter.status);
    if (filter.userId) params.append('userId', filter.userId);
    if (filter.leadId) params.append('leadId', filter.leadId);
    if (filter.clientId) params.append('clientId', filter.clientId);
    if (filter.projectId) params.append('projectId', filter.projectId);

    const response = await api.get<Appointment[]>(`/api/appointments?${params.toString()}`);
    return response.data;
  },

  async getAppointment(id: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`/api/appointments/${id}`);
    return response.data;
  },

  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    const response = await api.post<Appointment>('/api/appointments', input);
    return response.data;
  },

  async updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
    const response = await api.put<Appointment>(`/api/appointments/${id}`, input);
    return response.data;
  },

  async deleteAppointment(id: string): Promise<void> {
    await api.delete(`/api/appointments/${id}`);
  },

  async confirmAppointment(id: string): Promise<Appointment> {
    const response = await api.post<Appointment>(`/api/appointments/${id}/confirm`);
    return response.data;
  },

  async startAppointment(id: string): Promise<Appointment> {
    const response = await api.post<Appointment>(`/api/appointments/${id}/start`);
    return response.data;
  },

  async completeAppointment(id: string, data?: { outcome?: string; actualDuration?: number }): Promise<Appointment> {
    const response = await api.post<Appointment>(`/api/appointments/${id}/complete`, data || {});
    return response.data;
  },

  async cancelAppointment(id: string, reason: string): Promise<Appointment> {
    const response = await api.post<Appointment>(`/api/appointments/${id}/cancel`, { reason });
    return response.data;
  },

  async markNoShow(id: string): Promise<Appointment> {
    const response = await api.post<Appointment>(`/api/appointments/${id}/no-show`);
    return response.data;
  },

  async addParticipant(appointmentId: string, userId: string, role?: ParticipantRole): Promise<AppointmentParticipant> {
    const response = await api.post<AppointmentParticipant>(
      `/api/appointments/${appointmentId}/participants`,
      { userId, role: role || 'participant' }
    );
    return response.data;
  },

  async removeParticipant(appointmentId: string, userId: string): Promise<void> {
    await api.delete(`/api/appointments/${appointmentId}/participants/${userId}`);
  },

  async respondToInvitation(appointmentId: string, userId: string, status: ParticipantResponseStatus): Promise<AppointmentParticipant> {
    const response = await api.post<AppointmentParticipant>(
      `/api/appointments/${appointmentId}/participants/${userId}/respond`,
      { status }
    );
    return response.data;
  },

  async getAvailability(userId: string): Promise<AvailabilitySlot[]> {
    const response = await api.get<AvailabilitySlot[]>(`/api/availability/${userId}`);
    return response.data;
  },

  async setAvailability(slots: AvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    const response = await api.put<AvailabilitySlot[]>('/api/availability', { slots });
    return response.data;
  },

  async getAvailableSlots(userId: string, fromDate: string, toDate: string, duration: number): Promise<AvailableSlot[]> {
    const params = new URLSearchParams();
    params.append('fromDate', fromDate);
    params.append('toDate', toDate);
    params.append('duration', String(duration));

    const response = await api.get<AvailableSlot[]>(`/api/availability/${userId}/slots?${params.toString()}`);
    return response.data;
  },

  async addAvailabilityOverride(override: Omit<AvailabilityOverride, 'id'>): Promise<AvailabilityOverride> {
    const response = await api.post<AvailabilityOverride>('/api/availability/overrides', override);
    return response.data;
  },

  async deleteAvailabilityOverride(id: string): Promise<void> {
    await api.delete(`/api/availability/overrides/${id}`);
  },

  async getTypeConfigs(): Promise<AppointmentTypeConfig[]> {
    const response = await api.get<AppointmentTypeConfig[]>('/api/appointments/types');
    return response.data;
  },

  // Calendar sync
  async generateCalendarToken(): Promise<{ feedUrl: string; token: string }> {
    const response = await api.post<{ feedUrl: string; token: string }>('/api/calendar/generate-token');
    return response.data;
  },

  async revokeCalendarToken(): Promise<void> {
    await api.delete('/api/calendar/revoke-token');
  },

  async getAppointmentKPIs(filter?: { fromDate?: string; toDate?: string }): Promise<AppointmentKPIs> {
    const params = new URLSearchParams();
    if (filter?.fromDate) params.append('fromDate', filter.fromDate);
    if (filter?.toDate) params.append('toDate', filter.toDate);

    const queryString = params.toString();
    const url = queryString ? `/api/kpis/appointments?${queryString}` : '/api/kpis/appointments';
    const response = await api.get<AppointmentKPIs>(url);
    return response.data;
  },
};

export default appointmentsService;
