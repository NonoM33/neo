import { useState } from 'react';
import { Card, CardHeader, CardBody, Button } from '../ui';
import { callsService } from '../../services/calls.service';
import type { CallRecording } from '../../types/call.types';
import {
  QUALIFICATION_LABELS,
  QUALIFICATION_COLORS,
  SENTIMENT_LABELS,
  SENTIMENT_ICONS,
  NEEDS_LABELS,
  NEEDS_ICONS,
  CALL_TIMELINE_LABELS,
} from '../../types/call.types';

interface CallAnalysisCardProps {
  call: CallRecording;
  onApplied?: () => void;
}

export function CallAnalysisCard({ call, onApplied }: CallAnalysisCardProps) {
  const [applying, setApplying] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [appliedFields, setAppliedFields] = useState<string[] | null>(null);

  const analysis = call.aiAnalysis;
  if (!analysis) return null;

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await callsService.applyToLead(call.id);
      if (result.updated) {
        setAppliedFields(result.fields);
        onApplied?.();
      }
    } catch (error) {
      console.error('Erreur lors de l\'application:', error);
    } finally {
      setApplying(false);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await callsService.reanalyze(call.id);
    } catch (error) {
      console.error('Erreur lors de la r\u00e9analyse:', error);
    } finally {
      setReanalyzing(false);
    }
  };

  const qualColor = QUALIFICATION_COLORS[analysis.qualificationLabel];

  // Score gauge SVG
  const gaugeSize = 90;
  const strokeWidth = 6;
  const radius = (gaugeSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (analysis.qualificationScore / 100) * circumference;
  const dashOffset = circumference - progress;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-robot me-2" style={{ color: 'var(--neo-primary)' }}></i>
            Analyse IA de l'appel
          </span>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={handleReanalyze}
              disabled={reanalyzing}
              style={{ fontSize: '0.8rem' }}
            >
              {reanalyzing ? (
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
              ) : (
                <i className="bi bi-arrow-clockwise me-1"></i>
              )}
              R\u00e9analyser
            </button>
            {call.leadId && (
              <Button
                size="sm"
                variant="primary"
                icon="bi-check2-circle"
                loading={applying}
                onClick={handleApply}
              >
                Appliquer au lead
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {/* Applied success message */}
        {appliedFields && (
          <div
            className="mb-3 p-3 rounded"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--neo-success)',
            }}
          >
            <i className="bi bi-check-circle-fill me-2"></i>
            Donn\u00e9es appliqu\u00e9es au lead : {appliedFields.join(', ')}
          </div>
        )}

        {/* Summary */}
        <div
          className="p-3 rounded mb-4"
          style={{
            background: 'var(--neo-primary-light)',
            border: '1px solid var(--neo-primary)',
            borderLeftWidth: '4px',
          }}
        >
          <div className="d-flex align-items-start gap-2">
            <i className="bi bi-chat-quote" style={{ color: 'var(--neo-primary)', fontSize: '1.2rem', marginTop: '2px' }}></i>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--neo-text-primary)' }}>R\u00e9sum\u00e9</div>
              <p className="mb-0" style={{ color: 'var(--neo-text-primary)', lineHeight: 1.6 }}>{analysis.summary}</p>
            </div>
          </div>
        </div>

        {/* Score + Sentiment + Qualification row */}
        <div className="row g-3 mb-4">
          {/* Score gauge */}
          <div className="col-md-4">
            <div className="text-center p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <div style={{ position: 'relative', width: gaugeSize, height: gaugeSize, margin: '0 auto' }}>
                <svg width={gaugeSize} height={gaugeSize} style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx={gaugeSize / 2}
                    cy={gaugeSize / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--neo-bg-body)"
                    strokeWidth={strokeWidth}
                  />
                  <circle
                    cx={gaugeSize / 2}
                    cy={gaugeSize / 2}
                    r={radius}
                    fill="none"
                    stroke={qualColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{
                      transition: 'stroke-dashoffset 1s ease-out',
                      filter: `drop-shadow(0 0 4px ${qualColor})`,
                    }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: qualColor, lineHeight: 1 }}>
                    {analysis.qualificationScore}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <span
                  className="badge"
                  style={{
                    background: qualColor,
                    color: analysis.qualificationLabel === 'chaud' ? 'var(--neo-bg-body)' : undefined,
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                  }}
                >
                  {QUALIFICATION_LABELS[analysis.qualificationLabel]}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neo-text-secondary)', marginTop: '4px' }}>
                Score de qualification
              </div>
            </div>
          </div>

          {/* Sentiment */}
          <div className="col-md-4">
            <div className="text-center p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <i
                className={`bi ${SENTIMENT_ICONS[analysis.sentiment]}`}
                style={{
                  fontSize: '2.5rem',
                  color: analysis.sentiment === 'positif'
                    ? 'var(--neo-success)'
                    : analysis.sentiment === 'negatif'
                      ? 'var(--neo-danger)'
                      : 'var(--neo-warning)',
                }}
              ></i>
              <div style={{ fontWeight: 600, marginTop: '8px', color: 'var(--neo-text-primary)' }}>
                {SENTIMENT_LABELS[analysis.sentiment]}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neo-text-secondary)' }}>
                Sentiment d\u00e9tect\u00e9
              </div>
            </div>
          </div>

          {/* Decision maker */}
          <div className="col-md-4">
            <div className="text-center p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <i
                className={`bi ${analysis.decisionMaker ? 'bi-person-check' : analysis.decisionMaker === false ? 'bi-person-x' : 'bi-person-question'}`}
                style={{
                  fontSize: '2.5rem',
                  color: analysis.decisionMaker
                    ? 'var(--neo-success)'
                    : analysis.decisionMaker === false
                      ? 'var(--neo-danger)'
                      : 'var(--neo-text-muted)',
                }}
              ></i>
              <div style={{ fontWeight: 600, marginTop: '8px', color: 'var(--neo-text-primary)' }}>
                {analysis.decisionMaker === true
                  ? 'D\u00e9cisionnaire'
                  : analysis.decisionMaker === false
                    ? 'Non d\u00e9cisionnaire'
                    : 'Non d\u00e9termin\u00e9'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neo-text-secondary)' }}>
                Pouvoir de d\u00e9cision
              </div>
            </div>
          </div>
        </div>

        {/* Detected needs */}
        {analysis.needs.length > 0 && (
          <div className="mb-4">
            <h6 style={{ fontWeight: 600, color: 'var(--neo-text-primary)', marginBottom: '12px' }}>
              <i className="bi bi-lightbulb me-2" style={{ color: 'var(--neo-warning)' }}></i>
              Besoins d\u00e9tect\u00e9s
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {analysis.needs.map((need) => (
                <span
                  key={need}
                  className="badge d-flex align-items-center gap-1"
                  style={{
                    background: 'var(--neo-primary-light)',
                    color: 'var(--neo-primary)',
                    border: '1px solid var(--neo-primary)',
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                  }}
                >
                  <i className={`bi ${NEEDS_ICONS[need] || 'bi-three-dots'}`}></i>
                  {NEEDS_LABELS[need] || need}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Info grid: Budget, Timeline, Housing, Location */}
        <div className="row g-3 mb-4">
          {/* Budget */}
          <div className="col-md-6">
            <div className="p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-wallet2" style={{ color: 'var(--neo-success)' }}></i>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neo-text-primary)' }}>Budget</span>
              </div>
              {analysis.budget.mentioned ? (
                <div>
                  {analysis.budget.exact && (
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--neo-success)' }}>
                      {formatCurrency(analysis.budget.exact)}
                    </div>
                  )}
                  {analysis.budget.range && (
                    <div style={{ color: 'var(--neo-text-secondary)', fontSize: '0.875rem' }}>
                      Fourchette : {analysis.budget.range}
                    </div>
                  )}
                  {!analysis.budget.exact && !analysis.budget.range && (
                    <div style={{ color: 'var(--neo-text-secondary)', fontSize: '0.875rem' }}>
                      Mentionn\u00e9 sans montant pr\u00e9cis
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--neo-text-muted)', fontSize: '0.875rem' }}>Non mentionn\u00e9</div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="col-md-6">
            <div className="p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-clock" style={{ color: 'var(--neo-info)' }}></i>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neo-text-primary)' }}>D\u00e9lai</span>
              </div>
              {analysis.timeline ? (
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: analysis.timeline === 'urgent' ? 'var(--neo-danger)' : 'var(--neo-text-primary)',
                }}>
                  {CALL_TIMELINE_LABELS[analysis.timeline]}
                  {analysis.timeline === 'urgent' && (
                    <i className="bi bi-exclamation-triangle ms-2" style={{ color: 'var(--neo-danger)' }}></i>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--neo-text-muted)', fontSize: '0.875rem' }}>Non mentionn\u00e9</div>
              )}
            </div>
          </div>

          {/* Housing type */}
          <div className="col-md-6">
            <div className="p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-house" style={{ color: 'var(--neo-primary)' }}></i>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neo-text-primary)' }}>Logement</span>
              </div>
              <div style={{ color: 'var(--neo-text-primary)' }}>
                {analysis.housingType
                  ? (analysis.housingType === 'maison' ? 'Maison' : 'Appartement')
                  : <span style={{ color: 'var(--neo-text-muted)', fontSize: '0.875rem' }}>Non mentionn\u00e9</span>
                }
                {analysis.surface && (
                  <span style={{ color: 'var(--neo-text-secondary)', marginLeft: '8px', fontSize: '0.875rem' }}>
                    ({analysis.surface} m\u00b2)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="col-md-6">
            <div className="p-3 rounded" style={{ background: 'var(--neo-bg-light)', border: '1px solid var(--neo-border-color)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className="bi bi-geo-alt" style={{ color: 'var(--neo-danger)' }}></i>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neo-text-primary)' }}>Localisation</span>
              </div>
              {analysis.city || analysis.postalCode ? (
                <div style={{ color: 'var(--neo-text-primary)' }}>
                  {analysis.postalCode && <span>{analysis.postalCode} </span>}
                  {analysis.city}
                </div>
              ) : (
                <div style={{ color: 'var(--neo-text-muted)', fontSize: '0.875rem' }}>Non mentionn\u00e9e</div>
              )}
            </div>
          </div>
        </div>

        {/* Competition */}
        {analysis.competition.mentioned && (
          <div className="mb-4">
            <div
              className="p-3 rounded"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-people" style={{ color: 'var(--neo-warning)' }}></i>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neo-text-primary)' }}>Concurrence mentionn\u00e9e</span>
              </div>
              {analysis.competition.details && (
                <p className="mb-0" style={{ color: 'var(--neo-text-secondary)', fontSize: '0.875rem' }}>
                  {analysis.competition.details}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Objections */}
        {analysis.objections.length > 0 && (
          <div className="mb-4">
            <h6 style={{ fontWeight: 600, color: 'var(--neo-text-primary)', marginBottom: '12px' }}>
              <i className="bi bi-exclamation-triangle me-2" style={{ color: 'var(--neo-danger)' }}></i>
              Objections d\u00e9tect\u00e9es
            </h6>
            <ul className="list-unstyled mb-0">
              {analysis.objections.map((objection, idx) => (
                <li
                  key={idx}
                  className="d-flex align-items-start gap-2 mb-2 p-2 rounded"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  <i className="bi bi-dash-circle" style={{ color: 'var(--neo-danger)', marginTop: '2px' }}></i>
                  <span style={{ color: 'var(--neo-text-primary)', fontSize: '0.9rem' }}>{objection}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key quotes */}
        {analysis.keyQuotes.length > 0 && (
          <div className="mb-4">
            <h6 style={{ fontWeight: 600, color: 'var(--neo-text-primary)', marginBottom: '12px' }}>
              <i className="bi bi-quote me-2" style={{ color: 'var(--neo-primary)' }}></i>
              Citations cl\u00e9s
            </h6>
            <div className="d-flex flex-column gap-2">
              {analysis.keyQuotes.map((quote, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded"
                  style={{
                    background: 'var(--neo-bg-light)',
                    borderLeft: '3px solid var(--neo-primary)',
                    fontStyle: 'italic',
                    color: 'var(--neo-text-secondary)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  &laquo; {quote} &raquo;
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next action */}
        {analysis.nextAction && (
          <div
            className="p-3 rounded"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderLeftWidth: '4px',
            }}
          >
            <div className="d-flex align-items-start gap-2">
              <i className="bi bi-arrow-right-circle-fill" style={{ color: 'var(--neo-success)', fontSize: '1.2rem', marginTop: '2px' }}></i>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--neo-text-primary)' }}>Prochaine action recommand\u00e9e</div>
                <p className="mb-0" style={{ color: 'var(--neo-text-primary)', fontSize: '0.9rem' }}>{analysis.nextAction}</p>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default CallAnalysisCard;
