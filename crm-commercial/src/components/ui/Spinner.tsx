interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';

  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner-border text-primary ${sizeClass}`} role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
    </div>
  );
}

export default Spinner;
