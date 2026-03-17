export interface DashboardData {
  period: {
    from: string;
    to: string;
  };
  leads: {
    total: number;
    won: number;
    lost: number;
    open: number;
    conversionRate: number;
  };
  activities: {
    completed: number;
  };
  revenue: {
    totalValue: number;
    weightedValue: number;
  };
}

export interface PipelineStage {
  status: string;
  count: number;
  totalValue: number;
  weightedValue: number;
  avgProbability: number;
}

export interface PipelineAnalysis {
  stages: PipelineStage[];
  totals: {
    count: number;
    totalValue: number;
    weightedValue: number;
  };
}

export interface ConversionBySource {
  source: string;
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
  revenue: number;
}

export interface ConversionStats {
  overall: {
    total: number;
    won: number;
    lost: number;
    conversionRate: number;
  };
  bySource: ConversionBySource[];
}

export interface ActivityByType {
  type: string;
  total: number;
  completed: number;
  cancelled: number;
  totalDurationMinutes: number;
}

export interface ActivityMetrics {
  byType: ActivityByType[];
  byStatus: { status: string; count: number }[];
}

export interface SalesObjective {
  id: string;
  userId: string;
  year: number;
  month?: number;
  quarter?: number;
  revenueTarget?: string;
  leadsTarget?: number;
  conversionsTarget?: number;
  activitiesTarget?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveProgress {
  revenue: { target: number | null; actual: number; percentage: number | null };
  leads: { target: number | null; actual: number; percentage: number | null };
  conversions: { target: number | null; actual: number; percentage: number | null };
  activities: { target: number | null; actual: number; percentage: number | null };
}

export interface ObjectiveWithProgress {
  objective: SalesObjective;
  period: { from: string; to: string };
  progress: ObjectiveProgress;
}

export interface KPIFilter {
  userId?: string;
  year?: number;
  month?: number;
  quarter?: number;
  fromDate?: string;
  toDate?: string;
}
