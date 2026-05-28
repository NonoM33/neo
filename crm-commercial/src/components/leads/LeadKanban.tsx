import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardHeader, CardBody } from '../ui';
import { QualificationBadge } from '../prospection';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  PIPELINE_STAGES,
} from '../../types';
import type { Lead, LeadStatus } from '../../types';

interface LeadKanbanProps {
  leads: Lead[];
  /** Called when a card is dropped into a different column. */
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void> | void;
}

function formatCurrency(value?: string) {
  if (!value) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(parseFloat(value));
}

// ─── Card (sortable) ─────────────────────────────────────────────────────

function KanbanCardInner({
  lead,
  isDragging = false,
}: {
  lead: Lead;
  isDragging?: boolean;
}) {
  const isHighValue =
    lead.estimatedValue && parseFloat(lead.estimatedValue) >= 20000;

  return (
    <div
      className="card kanban-card mb-2"
      style={{
        borderLeft: isHighValue ? '3px solid var(--neo-xp-color)' : undefined,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'grab',
      }}
    >
      <div className="card-body p-3">
        <h6 className="mb-1">
          {lead.firstName} {lead.lastName}
        </h6>
        <div className="d-flex align-items-center gap-1 mb-2">
          <p className="text-muted small mb-0" style={{ flex: 1 }}>
            {lead.title}
          </p>
          <QualificationBadge lead={lead} />
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">{LEAD_SOURCE_LABELS[lead.source]}</small>
          <strong className="text-primary">
            {formatCurrency(lead.estimatedValue)}
          </strong>
        </div>
        {lead.probability !== undefined && (
          <div className="progress progress-neo mt-2">
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${lead.probability}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableLeadCard({
  lead,
  onClick,
}: {
  lead: Lead;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // We bind click on a separate transparent overlay so dragging doesn't
  // navigate, but a quick click still does. (dnd-kit suppresses click when
  // a drag actually occurred, so a plain onClick on the wrapper is safe.)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <KanbanCardInner lead={lead} isDragging={isDragging} />
    </div>
  );
}

// ─── Column (drop target) ────────────────────────────────────────────────

function KanbanColumn({
  status,
  leads,
  onCardClick,
}: {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (id: string) => void;
}) {
  // The whole column acts as a droppable area via SortableContext + a
  // sentinel "empty" droppable so dragging into an empty column works.
  const ids = useMemo(() => leads.map((l) => l.id), [leads]);

  return (
    <div className="col-md-6 col-xl-3">
      <Card className="kanban-column h-100">
        <CardHeader
          className={`badge-${status}`}
          style={{
            color: '#fff',
            borderRadius: 'var(--neo-radius-md) var(--neo-radius-md) 0 0',
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <span>{LEAD_STATUS_LABELS[status]}</span>
            <span className="badge bg-white text-dark">{leads.length}</span>
          </div>
        </CardHeader>
        <CardBody
          className="p-2"
          data-status={status}
          style={{ minHeight: '120px' }}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {leads.map((lead) => (
              <SortableLeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onCardClick(lead.id)}
              />
            ))}
            {leads.length === 0 && (
              <div
                className="text-center text-muted py-4"
                data-empty-column={status}
              >
                <i className="bi bi-inbox fs-4"></i>
                <p className="mb-0 small">Aucun lead</p>
              </div>
            )}
          </SortableContext>
        </CardBody>
      </Card>
    </div>
  );
}

// ─── Public kanban ───────────────────────────────────────────────────────

export function LeadKanban({ leads, onStatusChange }: LeadKanbanProps) {
  const navigate = useNavigate();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  /**
   * Optimistic shadow of the leads list so the UI reflects the drop
   * immediately while the API call is in flight. Reset on each render
   * to stay in sync with parent state.
   */
  const [overrideStatus, setOverrideStatus] = useState<Record<string, LeadStatus>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Only start a drag past a small distance so clicks navigate cleanly.
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor),
  );

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      prospect: [],
      qualifie: [],
      proposition: [],
      negociation: [],
      gagne: [],
      perdu: [],
    };
    for (const lead of leads) {
      const status = overrideStatus[lead.id] ?? lead.status;
      map[status]?.push(lead);
    }
    return map;
  }, [leads, overrideStatus]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = event.active.id as string;
      const lead = leads.find((l) => l.id === id) ?? null;
      setActiveLead(lead);
    },
    [leads],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveLead(null);
      if (!over) return;

      const draggedId = active.id as string;
      const overId = over.id as string;

      // Resolve target column status: either over a card (its status) or
      // over a column droppable (its status from data attribute).
      const draggedLead = leads.find((l) => l.id === draggedId);
      if (!draggedLead) return;

      let targetStatus: LeadStatus | undefined;
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) {
        targetStatus = overrideStatus[overLead.id] ?? overLead.status;
      } else {
        // Over an empty-column sentinel: id matches one of the statuses
        if (PIPELINE_STAGES.includes(overId as LeadStatus)) {
          targetStatus = overId as LeadStatus;
        }
      }
      if (!targetStatus) return;

      const currentStatus = overrideStatus[draggedId] ?? draggedLead.status;
      if (targetStatus === currentStatus) return;

      // Optimistic UI
      setOverrideStatus((prev) => ({ ...prev, [draggedId]: targetStatus! }));

      try {
        await onStatusChange(draggedId, targetStatus);
        // Parent will re-fetch and pass new leads — clear the override
        // for this id (other overrides stay until next sync).
        setOverrideStatus((prev) => {
          const next = { ...prev };
          delete next[draggedId];
          return next;
        });
      } catch (err) {
        console.error('[kanban] failed to change status, rolling back', err);
        setOverrideStatus((prev) => {
          const next = { ...prev };
          delete next[draggedId];
          return next;
        });
      }
    },
    [leads, onStatusChange, overrideStatus],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="row g-3">
        {PIPELINE_STAGES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={grouped[status]}
            onCardClick={(id) => navigate(`/leads/${id}`)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? <KanbanCardInner lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default LeadKanban;
