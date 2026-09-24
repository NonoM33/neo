import type { CSSProperties } from 'react';

export type AvatarTone = 'ochre' | 'blue' | 'green' | 'ink' | 'grad';

interface AvatarProps {
  name?: string;
  size?: number;
  tone?: AvatarTone;
  style?: CSSProperties;
}

export function Avatar({ name = '', size = 36, tone = 'ochre', style }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={`avatar ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.38, ...style }}
    >
      {initials}
    </div>
  );
}
