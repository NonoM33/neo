import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardHeader({ children, className = '', style }: CardHeaderProps) {
  return <div className={`card-header ${className}`} style={style}>{children}</div>;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CardBody({ children, className = '', style }: CardBodyProps) {
  return <div className={`card-body ${className}`} style={style}>{children}</div>;
}

export default Card;
