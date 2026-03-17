import api from './api';
import type {
  DashboardData,
  PipelineAnalysis,
  ConversionStats,
  ActivityMetrics,
  SalesObjective,
  ObjectiveWithProgress,
  KPIFilter,
} from '../types';

export interface CreateObjectiveInput {
  userId: string;
  year: number;
  month?: number;
  quarter?: number;
  revenueTarget?: number;
  leadsTarget?: number;
  conversionsTarget?: number;
  activitiesTarget?: number;
}

export const kpisService = {
  async getDashboard(filter?: KPIFilter): Promise<DashboardData> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.year) params.append('year', String(filter.year));
      if (filter.month) params.append('month', String(filter.month));
      if (filter.quarter) params.append('quarter', String(filter.quarter));
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
    }

    const response = await api.get<DashboardData>(`/api/kpis/dashboard?${params.toString()}`);
    return response.data;
  },

  async getPipeline(filter?: KPIFilter): Promise<PipelineAnalysis> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
    }

    const response = await api.get<PipelineAnalysis>(`/api/kpis/pipeline?${params.toString()}`);
    return response.data;
  },

  async getConversions(filter?: KPIFilter): Promise<ConversionStats> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
    }

    const response = await api.get<ConversionStats>(`/api/kpis/conversions?${params.toString()}`);
    return response.data;
  },

  async getActivityMetrics(filter?: KPIFilter): Promise<ActivityMetrics> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
    }

    const response = await api.get<ActivityMetrics>(`/api/kpis/activities?${params.toString()}`);
    return response.data;
  },

  async getObjectives(filter?: KPIFilter): Promise<ObjectiveWithProgress[]> {
    const params = new URLSearchParams();

    if (filter) {
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.year) params.append('year', String(filter.year));
      if (filter.month) params.append('month', String(filter.month));
      if (filter.quarter) params.append('quarter', String(filter.quarter));
    }

    const response = await api.get<ObjectiveWithProgress[]>(`/api/kpis/objectives?${params.toString()}`);
    return response.data;
  },

  async createObjective(input: CreateObjectiveInput): Promise<SalesObjective> {
    const response = await api.post<SalesObjective>('/api/kpis/objectives', input);
    return response.data;
  },
};

export default kpisService;
