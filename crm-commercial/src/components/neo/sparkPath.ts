export function sparkPath(values: number[], w = 120, h = 34): string {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(
          h -
          ((v - min) / span) * (h - 6) -
          3
        ).toFixed(1)}`,
    )
    .join(' ');
}
