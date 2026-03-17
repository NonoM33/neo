import { create } from 'zustand';
import type { Lead, Activity } from '../types';
import type { LeadScore, SmartSuggestion, ProspectionStats } from '../types/prospection.types';
import { computeLeadScore } from '../services/scoring.engine';
import { getTopSuggestions } from '../services/suggestions.engine';
import { computeProspectionStats } from '../services/prospection.service';

interface ProspectionState {
  scores: Record<string, LeadScore>;
  suggestions: SmartSuggestion[];
  stats: ProspectionStats | null;
  initialized: boolean;

  initialize: (leads: Lead[], activities: Activity[]) => void;
  refresh: (leads: Lead[], activities: Activity[]) => void;
  getLeadScore: (leadId: string) => LeadScore | undefined;
  getLeadSuggestions: (leadId: string) => SmartSuggestion[];
}

export const useProspectionStore = create<ProspectionState>((set, get) => ({
  scores: {},
  suggestions: [],
  stats: null,
  initialized: false,

  initialize: (leads, activities) => {
    const scores: Record<string, LeadScore> = {};
    for (const lead of leads) {
      scores[lead.id] = computeLeadScore(lead, activities);
    }

    const suggestions = getTopSuggestions(leads, activities, 20);
    const stats = computeProspectionStats(leads, activities);

    set({ scores, suggestions, stats, initialized: true });
  },

  refresh: (leads, activities) => {
    get().initialize(leads, activities);
  },

  getLeadScore: (leadId) => get().scores[leadId],

  getLeadSuggestions: (leadId) =>
    get().suggestions.filter(s => s.leadId === leadId),
}));

export default useProspectionStore;
