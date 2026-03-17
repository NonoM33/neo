import type { LeadStatus, ActivityType } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  return <span className={`badge bg-${variant} ${className}`}>{children}</span>;
}

interface StatusBadgeProps {
  status: LeadStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

interface ActivityBadgeProps {
  type: ActivityType;
}

export function ActivityBadge({ type }: ActivityBadgeProps) {
  return <span className={`badge badge-${type}`}>{type}</span>;
}

export default Badge;
