import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody, Spinner } from '../ui';
import { callsService } from '../../services/calls.service';
import type { CallRecording } from '../../types/call.types';
import {
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  QUALIFICATION_LABELS,
  QUALIFICATION_COLORS,
  SENTIMENT_LABELS,
  SENTIMENT_ICONS,
} from '../../types/call.types';
import CallAnalysisCard from './CallAnalysisCard';

interface CallHistoryListProps {
  leadId: string;
}

export function CallHistoryList({ leadId }: CallHistoryListProps) {
  const [calls, setCalls] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCalls = useCallback(async () => {
    try {
      setError(null);
      const data = await callsService.getCalls(leadId);
      setCalls(data);
    } catch (err) {
      console.error('Erreur chargement appels:', err);
      setError('Impossible de charger l\'historique des appels.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const handleDelete = async (callId: string) => {
    setDeleting(true);
    try {
      await callsService.deleteCall(callId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
      setDeleteConfirmId(null);
      if (expandedId === callId) setExpandedId(null);
    } catch (err) {
      console.error('Erreur suppression:', err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (callId: string) => {
    setExpandedId((prev) => (prev === callId ? null : callId));
    setDeleteConfirmId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <i className="bi bi-telephone me-2"></i>
          Historique des appels
        </CardHeader>
        <CardBody>
          <Spinner size="sm" />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <i className="bi bi-telephone me-2"></i>
          Historique des appels
        </CardHeader>
        <CardBody>
          <div
            className="p-3 rounded"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--neo-danger)',
              fontSize: '0.875rem',
            }}
          >
            <i className="bi bi-exclamation-triangle me-1"></i>
            {error}
            <button className="btn btn-sm btn-outline-primary ms-2" onClick={loadCalls}>
              R\u00e9essayer
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <i className="bi bi-telephone me-2"></i>
          Historique des appels
        </CardHeader>
        <CardBody>
          <div className="text-center py-4">
            <i className="bi bi-telephone-x" style={{ fontSize: '2rem', color: 'var(--neo-text-muted)' }}></i>
            <p className="mb-0 mt-2" style={{ color: 'var(--neo-text-muted)' }}>Aucun appel enregistr\u00e9</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-telephone me-2"></i>
            Historique des appels
            <span
              className="badge ms-2"
              style={{
                background: 'var(--neo-primary-light)',
                color: 'var(--neo-primary)',
                fontSize: '0.75rem',
              }}
            >
              {calls.length}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="d-flex flex-column">
          {calls.map((call) => {
            const isExpanded = expandedId === call.id;
            const isConfirmingDelete = deleteConfirmId === call.id;

            return (
              <div key={call.id}>
                {/* Call summary row */}
                <div
                  className="d-flex align-items-center justify-content-between p-3"
                  style={{
                    borderBottom: '1px solid var(--neo-border-color)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: isExpanded ? 'var(--neo-bg-light)' : 'transparent',
                  }}
                  onClick={() => toggleExpand(call.id)}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = 'var(--neo-bg-light)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    {/* Call icon */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--neo-primary-light)',
                        flexShrink: 0,
                      }}
                    >
                      <i className="bi bi-telephone-fill" style={{ color: 'var(--neo-primary)', fontSize: '0.9rem' }}></i>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span style={{ fontWeight: 600, color: 'var(--neo-text-primary)', fontSize: '0.9rem' }}>
                          {formatDate(call.createdAt)}
                        </span>
                        {/* Status badge */}
                        <span
                          className="badge"
                          style={{
                            background: `${CALL_STATUS_COLORS[call.status]}20`,
                            color: CALL_STATUS_COLORS[call.status],
                            border: `1px solid ${CALL_STATUS_COLORS[call.status]}40`,
                            fontSize: '0.7rem',
                          }}
                        >
                          {CALL_STATUS_LABELS[call.status]}
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-3" style={{ fontSize: '0.8rem', color: 'var(--neo-text-secondary)' }}>
                        {/* Duration */}
                        <span>
                          <i className="bi bi-clock me-1"></i>
                          {formatDuration(call.duration)}
                        </span>
                        {/* File size */}
                        {call.fileSize && (
                          <span>
                            <i className="bi bi-file-earmark me-1"></i>
                            {formatFileSize(call.fileSize)}
                          </span>
                        )}
                        {/* Sentiment */}
                        {call.aiAnalysis && (
                          <span>
                            <i className={`bi ${SENTIMENT_ICONS[call.aiAnalysis.sentiment]} me-1`}></i>
                            {SENTIMENT_LABELS[call.aiAnalysis.sentiment]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {/* Qualification badge */}
                    {call.aiAnalysis && (
                      <span
                        className="badge"
                        style={{
                          background: QUALIFICATION_COLORS[call.aiAnalysis.qualificationLabel],
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          color: call.aiAnalysis.qualificationLabel === 'chaud' ? 'var(--neo-bg-body)' : undefined,
                        }}
                      >
                        {QUALIFICATION_LABELS[call.aiAnalysis.qualificationLabel]}
                        <span className="ms-1" style={{ opacity: 0.8 }}>
                          {call.aiAnalysis.qualificationScore}/100
                        </span>
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(isConfirmingDelete ? null : call.id);
                      }}
                      title="Supprimer"
                    >
                      <i className="bi bi-trash"></i>
                    </button>

                    {/* Expand chevron */}
                    <i
                      className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}
                      style={{ color: 'var(--neo-text-muted)', fontSize: '0.8rem' }}
                    ></i>
                  </div>
                </div>

                {/* Delete confirmation */}
                {isConfirmingDelete && (
                  <div
                    className="d-flex align-items-center justify-content-between p-3"
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderBottom: '1px solid var(--neo-border-color)',
                    }}
                  >
                    <span style={{ color: 'var(--neo-danger)', fontSize: '0.875rem' }}>
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Supprimer cet enregistrement ? Cette action est irr\u00e9versible.
                    </span>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                        disabled={deleting}
                      >
                        Annuler
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(call.id); }}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        ) : (
                          <i className="bi bi-trash me-1"></i>
                        )}
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div
                    className="p-3"
                    style={{
                      background: 'var(--neo-bg-light)',
                      borderBottom: '1px solid var(--neo-border-color)',
                    }}
                  >
                    {/* Audio player */}
                    {call.audioUrl && (
                      <div className="mb-3">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--neo-text-secondary)', marginBottom: '6px', display: 'block' }}>
                          <i className="bi bi-play-circle me-1"></i>
                          Lecture audio
                        </label>
                        <audio
                          controls
                          preload="metadata"
                          style={{
                            width: '100%',
                            height: '40px',
                            borderRadius: '8px',
                          }}
                        >
                          <source src={call.audioUrl} type={call.mimeType} />
                          Votre navigateur ne supporte pas la lecture audio.
                        </audio>
                      </div>
                    )}

                    {/* Transcription */}
                    {call.transcription && (
                      <div className="mb-3">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--neo-text-secondary)', marginBottom: '6px', display: 'block' }}>
                          <i className="bi bi-file-text me-1"></i>
                          Transcription
                        </label>
                        <div
                          className="p-3 rounded"
                          style={{
                            background: 'var(--neo-bg-card)',
                            border: '1px solid var(--neo-border-color)',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            fontSize: '0.875rem',
                            lineHeight: 1.8,
                            color: 'var(--neo-text-primary)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {call.transcription}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {call.aiAnalysis && (
                      <CallAnalysisCard call={call} onApplied={loadCalls} />
                    )}

                    {/* Processing indicator for non-done calls */}
                    {['uploading', 'transcribing', 'analyzing'].includes(call.status) && (
                      <div className="d-flex align-items-center gap-2 p-3 rounded" style={{ background: 'var(--neo-bg-card)', border: '1px solid var(--neo-border-color)' }}>
                        <div className="spinner-border spinner-border-sm" role="status" style={{ color: CALL_STATUS_COLORS[call.status] }}>
                          <span className="visually-hidden">Traitement...</span>
                        </div>
                        <span style={{ color: 'var(--neo-text-secondary)', fontSize: '0.875rem' }}>
                          {CALL_STATUS_LABELS[call.status]}
                        </span>
                      </div>
                    )}

                    {/* Error display */}
                    {call.status === 'error' && (
                      <div
                        className="p-3 rounded"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <i className="bi bi-exclamation-circle me-1" style={{ color: 'var(--neo-danger)' }}></i>
                        <span style={{ color: 'var(--neo-danger)', fontSize: '0.875rem' }}>
                          {call.errorMessage || 'Une erreur est survenue lors du traitement.'}
                        </span>
                        <button
                          className="btn btn-sm btn-outline-primary ms-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            callsService.reanalyze(call.id).then(loadCalls);
                          }}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          R\u00e9essayer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

export default CallHistoryList;
