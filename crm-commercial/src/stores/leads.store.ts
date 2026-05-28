import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeadFilter } from '../types';

/**
 * Persisted lead-list state.
 *
 * Keeps the pipeline filters and the kanban/list view choice across
 * navigations and reloads — the team typically narrows the pipeline to
 * "their" leads then drills into a card, so resetting to "all" on every
 * back navigation is annoying.
 */
interface LeadsState {
  filter: LeadFilter;
  view: 'kanban' | 'list';
  setFilter: (filter: LeadFilter) => void;
  patchFilter: (patch: Partial<LeadFilter>) => void;
  resetFilter: () => void;
  setView: (view: 'kanban' | 'list') => void;
}

const EMPTY_FILTER: LeadFilter = {};

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set) => ({
      filter: EMPTY_FILTER,
      view: 'kanban',
      setFilter: (filter) => set({ filter }),
      patchFilter: (patch) =>
        set((state) => ({ filter: { ...state.filter, ...patch } })),
      resetFilter: () => set({ filter: EMPTY_FILTER }),
      setView: (view) => set({ view }),
    }),
    {
      name: 'neo-crm-leads-state',
      partialize: (state) => ({ filter: state.filter, view: state.view }),
    },
  ),
);

export default useLeadsStore;
