import type { TicketCategoryRef, TicketUserRef } from '../../types';

export function categoryName(category: TicketCategoryRef | null): string {
  return category?.name ?? '—';
}

export function assigneeId(assignedTo: TicketUserRef | null): string {
  return assignedTo?.id ?? '';
}

export function assigneeLabel(assignedTo: TicketUserRef | null): string {
  if (!assignedTo?.id) return '—';
  return `${assignedTo.firstName ?? ''} ${assignedTo.lastName ?? ''}`.trim() || '—';
}
