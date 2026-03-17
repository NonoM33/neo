import type { ProspectionStats } from '../../types/prospection.types';

interface FunnelChartProps {
  stats: ProspectionStats;
  stageCounts: { label: string; count: number; color: string }[];
}

export function FunnelChart({ stats, stageCounts }: FunnelChartProps) {
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);

  return (
    <div>
      <div className="d-flex flex-column gap-2">
        {stageCounts.map((stage, i) => {
          const width = Math.max((stage.count / maxCount) * 100, 15);
          const conversion = stats.conversionByStage[i];
          return (
            <div key={stage.label}>
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span style={{ fontSize: '0.8rem', color: 'var(--neo-text-secondary)' }}>
                  {stage.label}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neo-text-primary)' }}>
                  {stage.count}
                </span>
              </div>
              <div style={{
                height: '28px',
                borderRadius: '6px',
                background: 'var(--neo-bg-light)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  width: `${width}%`,
                  borderRadius: '6px',
                  background: `${stage.color}cc`,
                  transition: 'width 0.8s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: '0.7rem',
                    color: '#fff',
                    fontWeight: 600,
                  }}>
                    {stage.count}
                  </span>
                </div>
              </div>
              {/* Conversion arrow */}
              {conversion && i < stageCounts.length - 1 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2px 0',
                  color: conversion.rate >= 50 ? 'var(--neo-success)' : conversion.rate >= 25 ? 'var(--neo-warning)' : 'var(--neo-danger)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}>
                  ↓ {conversion.rate}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FunnelChart;
