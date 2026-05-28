import { useMemo, useState } from 'react';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
} from '../../types';
import type { LeadFilter, LeadStatus, LeadSource } from '../../types';
import { useLeadsStore } from '../../stores/leads.store';

/**
 * Compact filter panel sitting above the kanban/list view.
 * Reads & writes through the leads store so the selection survives
 * navigations and reloads.
 *
 * Why local "draft" state? The text input feeds into a search filter
 * that triggers a re-fetch — we don't want a re-fetch on every keystroke.
 * We commit the draft to the store on submit / blur / chip removal.
 */
export function LeadsFilters() {
  const filter = useLeadsStore((s) => s.filter);
  const patchFilter = useLeadsStore((s) => s.patchFilter);
  const resetFilter = useLeadsStore((s) => s.resetFilter);

  const [search, setSearch] = useState(filter.search ?? '');
  const [open, setOpen] = useState(false);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof LeadFilter; label: string }> = [];
    if (filter.status) {
      chips.push({
        key: 'status',
        label: `Statut : ${LEAD_STATUS_LABELS[filter.status]}`,
      });
    }
    if (filter.source) {
      chips.push({
        key: 'source',
        label: `Source : ${LEAD_SOURCE_LABELS[filter.source]}`,
      });
    }
    if (filter.minValue !== undefined) {
      chips.push({ key: 'minValue', label: `≥ ${filter.minValue} €` });
    }
    if (filter.maxValue !== undefined) {
      chips.push({ key: 'maxValue', label: `≤ ${filter.maxValue} €` });
    }
    if (filter.fromDate) {
      chips.push({ key: 'fromDate', label: `Depuis ${filter.fromDate}` });
    }
    if (filter.toDate) {
      chips.push({ key: 'toDate', label: `Jusqu'au ${filter.toDate}` });
    }
    if (filter.search) {
      chips.push({ key: 'search', label: `« ${filter.search} »` });
    }
    return chips;
  }, [filter]);

  const submitSearch = () => {
    patchFilter({ search: search.trim() || undefined });
  };

  const removeChip = (key: keyof LeadFilter) => {
    patchFilter({ [key]: undefined });
    if (key === 'search') setSearch('');
  };

  return (
    <div className="card mb-3">
      <div className="card-body py-2 px-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Search */}
          <form
            className="d-flex flex-grow-1"
            style={{ minWidth: 220 }}
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch();
            }}
          >
            <div className="input-group input-group-sm">
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Rechercher nom, société, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={submitSearch}
              />
            </div>
          </form>

          {/* Toggle advanced */}
          <button
            type="button"
            className={`btn btn-sm ${open ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setOpen((v) => !v)}
          >
            <i className="bi bi-funnel me-1"></i>
            Filtres
            {activeChips.length > 0 && (
              <span className="badge bg-light text-dark ms-2">
                {activeChips.length}
              </span>
            )}
          </button>

          {activeChips.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                resetFilter();
                setSearch('');
              }}
            >
              <i className="bi bi-x-circle me-1"></i>
              Tout effacer
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-2">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="badge bg-primary-subtle text-primary d-flex align-items-center gap-1"
                style={{ padding: '6px 10px' }}
              >
                {chip.label}
                <button
                  type="button"
                  aria-label={`Retirer ${chip.label}`}
                  className="btn-close btn-close-sm"
                  style={{ fontSize: '0.55rem' }}
                  onClick={() => removeChip(chip.key)}
                />
              </span>
            ))}
          </div>
        )}

        {/* Advanced panel */}
        {open && (
          <div className="row g-2 mt-2 pt-2 border-top">
            <div className="col-md-3">
              <label className="form-label small mb-1">Statut</label>
              <select
                className="form-select form-select-sm"
                value={filter.status ?? ''}
                onChange={(e) =>
                  patchFilter({
                    status: (e.target.value || undefined) as
                      | LeadStatus
                      | undefined,
                  })
                }
              >
                <option value="">Tous</option>
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-1">Source</label>
              <select
                className="form-select form-select-sm"
                value={filter.source ?? ''}
                onChange={(e) =>
                  patchFilter({
                    source: (e.target.value || undefined) as
                      | LeadSource
                      | undefined,
                  })
                }
              >
                <option value="">Toutes</option>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-1">Valeur min (€)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="0"
                value={filter.minValue ?? ''}
                onChange={(e) =>
                  patchFilter({
                    minValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small mb-1">Valeur max (€)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="∞"
                value={filter.maxValue ?? ''}
                onChange={(e) =>
                  patchFilter({
                    maxValue: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="col-md-2 d-flex gap-1">
              <div style={{ flex: 1 }}>
                <label className="form-label small mb-1">Depuis</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={filter.fromDate ?? ''}
                  onChange={(e) =>
                    patchFilter({ fromDate: e.target.value || undefined })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeadsFilters;
