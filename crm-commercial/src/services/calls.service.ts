import api from './api';
import type { CallRecording } from '../types/call.types';

export const callsService = {
  async uploadCall(file: File, leadId?: string): Promise<CallRecording> {
    const formData = new FormData();
    formData.append('file', file);
    if (leadId) formData.append('leadId', leadId);

    const response = await api.post<CallRecording>('/api/calls/upload', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  async getCalls(leadId?: string): Promise<CallRecording[]> {
    const params = leadId ? `?leadId=${leadId}` : '';
    const response = await api.get<CallRecording[]>(`/api/calls${params}`);
    return response.data;
  },

  async getCall(id: string): Promise<CallRecording> {
    const response = await api.get<CallRecording>(`/api/calls/${id}`);
    return response.data;
  },

  async reanalyze(id: string): Promise<CallRecording> {
    const response = await api.post<CallRecording>(`/api/calls/${id}/analyze`);
    return response.data;
  },

  async applyToLead(id: string): Promise<{ updated: boolean; fields: string[] }> {
    const response = await api.post<{ updated: boolean; fields: string[] }>(`/api/calls/${id}/apply`);
    return response.data;
  },

  async deleteCall(id: string): Promise<void> {
    await api.delete(`/api/calls/${id}`);
  },
};

export default callsService;
