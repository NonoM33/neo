import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';

interface CardProps {
  children?: ReactNode;
  head?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  padding?: number | string;
  flush?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function Card({
  children,
  head,
  icon,
  action,
  padding,
  flush,
  style,
  className,
}: CardProps) {
  return (
    <div
      className={'card' + (flush ? ' flush' : '') + (className ? ' ' + className : '')}
      style={{ ...(padding != null ? { padding } : {}), ...style }}
    >
      {head && (
        <div className="card-head" style={flush ? { padding: '16px 18px 0' } : undefined}>
          {icon && (
            <span className="ch-ic">
              <Icon name={icon} size={18} />
            </span>
          )}
          <h3>{head}</h3>
          {action && <span className="ch-act">{action}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
