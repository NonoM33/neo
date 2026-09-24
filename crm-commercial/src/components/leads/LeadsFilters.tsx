import { useMemo, useState } from 'react';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
} from '../../types';
import type { LeadFilter, LeadStatus, LeadSource } from '../../types';
import { useLeadsStore } from '../../stores/leads.store';
import { Icon, Btn } from '../neo';

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
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="fbar">
        <form
          className="fbar-search"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <Icon name="search" size={16} />
          <input
            type="search"
            className="neo-field"
            placeholder="Rechercher nom, société, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={submitSearch}
          />
        </form>

        <button
          type="button"
          className={`filter-chip${open ? ' on' : ''}`}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name="filter" size={15} />
          Filtres
          {activeChips.length > 0 && <span className="fc-count">{activeChips.length}</span>}
        </button>

        {activeChips.length > 0 && (
          <Btn
            variant="subtle"
            size="sm"
            icon="trash"
            onClick={() => {
              resetFilter();
              setSearch('');
            }}
          >
            Tout effacer
          </Btn>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="fbar" style={{ marginTop: 12 }}>
          {activeChips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button
                type="button"
                aria-label={`Retirer ${chip.label}`}
                className="chip-x"
                onClick={() => removeChip(chip.key)}
              >
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="field-grid">
          <div>
            <div className="field-label">Statut</div>
            <select
              className="neo-field"
              value={filter.status ?? ''}
              onChange={(e) =>
                patchFilter({
                  status: (e.target.value || undefined) as LeadStatus | undefined,
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
          <div>
            <div className="field-label">Source</div>
            <select
              className="neo-field"
              value={filter.source ?? ''}
              onChange={(e) =>
                patchFilter({
                  source: (e.target.value || undefined) as LeadSource | undefined,
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
          <div>
            <div className="field-label">Valeur min (€)</div>
            <input
              type="number"
              className="neo-field"
              placeholder="0"
              value={filter.minValue ?? ''}
              onChange={(e) =>
                patchFilter({
                  minValue: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <div className="field-label">Valeur max (€)</div>
            <input
              type="number"
              className="neo-field"
              placeholder="∞"
              value={filter.maxValue ?? ''}
              onChange={(e) =>
                patchFilter({
                  maxValue: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div>
            <div className="field-label">Depuis</div>
            <input
              type="date"
              className="neo-field"
              value={filter.fromDate ?? ''}
              onChange={(e) => patchFilter({ fromDate: e.target.value || undefined })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadsFilters;
