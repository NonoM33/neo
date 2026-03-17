interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  trend?: {
    value: number;
    label: string;
  };
}

const colorClasses: Record<StatCardProps['color'], string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <div className={`stat-card ${colorClasses[color]}`}>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {trend && (
          <div className="stat-trend mt-2">
            <small>
              <i className={`bi bi-arrow-${trend.value >= 0 ? 'up' : 'down'} me-1`}></i>
              {Math.abs(trend.value)}% {trend.label}
            </small>
          </div>
        )}
      </div>
      <div className="stat-icon">
        <i className={`bi ${icon}`}></i>
      </div>
    </div>
  );
}

export default StatCard;
