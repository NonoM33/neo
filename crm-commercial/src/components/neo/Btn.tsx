import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';

export type BtnVariant = 'primary' | 'ochre' | 'success' | 'ghost' | 'subtle' | 'danger' | 'danger-ghost';
export type BtnSize = 'sm' | 'md' | 'lg';

interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconName;
  iconRight?: IconName;
  style?: CSSProperties;
}

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  style,
  ...rest
}: BtnProps) {
  const cls =
    'btn' +
    (variant !== 'primary' ? ' ' + variant : '') +
    (size !== 'md' ? ' ' + size : '');
  const iconSize = size === 'sm' ? 15 : 17;
  return (
    <button className={cls} style={style} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
