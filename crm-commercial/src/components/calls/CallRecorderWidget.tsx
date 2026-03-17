import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardBody } from '../ui';
import { callsService } from '../../services/calls.service';
import type { CallRecording } from '../../types/call.types';
import { CALL_STATUS_LABELS, CALL_STATUS_COLORS } from '../../types/call.types';
import CallAnalysisCard from './CallAnalysisCard';

interface CallRecorderWidgetProps {
  leadId?: string;
  onCallComplete?: (call: CallRecording) => void;
}

export function CallRecorderWidget({ leadId, onCallComplete }: CallRecorderWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [_audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallRecording | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setError(null);
    setPermissionDenied(false);
    setCurrentCall(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      chunksRef.current = [];
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          setAudioChunks([...chunksRef.current]);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionDenied(true);
      } else {
        setError('Impossible d\'acc\u00e9der au microphone. V\u00e9rifiez les permissions.');
      }
      console.error('Erreur microphone:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      // Override onstop to handle upload after data is flushed
      const originalOnStop = mediaRecorder.onstop;
      mediaRecorder.onstop = async (event) => {
        if (originalOnStop) {
          (originalOnStop as (ev: Event) => void)(event);
        }

        const allChunks = chunksRef.current;
        if (allChunks.length === 0) {
          setError('Aucune donn\u00e9e audio enregistr\u00e9e.');
          setIsRecording(false);
          return;
        }

        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(allChunks, { type: mimeType });
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([audioBlob], `appel_${Date.now()}.${extension}`, { type: mimeType });

        setIsRecording(false);
        setIsUploading(true);
        setError(null);

        try {
          const call = await callsService.uploadCall(file, leadId);
          setCurrentCall(call);
        } catch (uploadError) {
          console.error('Erreur upload:', uploadError);
          setError('Erreur lors de l\'envoi de l\'enregistrement.');
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.stop();
    }
  }, [mediaRecorder, leadId]);

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      mediaRecorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    chunksRef.current = [];
    setAudioChunks([]);
  };

  // Poll for status updates while processing
  useEffect(() => {
    if (currentCall && ['uploading', 'transcribing', 'analyzing'].includes(currentCall.status)) {
      pollRef.current = window.setInterval(async () => {
        try {
          const updated = await callsService.getCall(currentCall.id);
          setCurrentCall(updated);
          if (updated.status === 'done' || updated.status === 'error') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            if (updated.status === 'done') {
              onCallComplete?.(updated);
            }
          }
        } catch (pollError) {
          console.error('Erreur polling:', pollError);
        }
      }, 2000);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }
  }, [currentCall?.id, currentCall?.status, onCallComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const resetWidget = () => {
    setCurrentCall(null);
    setError(null);
    setDuration(0);
    chunksRef.current = [];
    setAudioChunks([]);
  };

  // Processing status display
  const isProcessing = currentCall && ['uploading', 'transcribing', 'analyzing'].includes(currentCall.status);
  const isDone = currentCall?.status === 'done';
  const isError = currentCall?.status === 'error';

  return (
    <div className="call-recorder-widget">
      {/* Initial state: Record button */}
      {!isRecording && !isUploading && !currentCall && (
        <div>
          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={startRecording}
            style={{ padding: '10px 20px' }}
          >
            <i className="bi bi-mic-fill"></i>
            Enregistrer un appel
          </button>

          {permissionDenied && (
            <div
              className="mt-2 p-2 rounded"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--neo-danger)',
                fontSize: '0.85rem',
              }}
            >
              <i className="bi bi-shield-exclamation me-1"></i>
              L'acc\u00e8s au microphone a \u00e9t\u00e9 refus\u00e9. Autorisez l'acc\u00e8s dans les param\u00e8tres de votre navigateur.
            </div>
          )}

          {error && !permissionDenied && (
            <div
              className="mt-2 p-2 rounded"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--neo-danger)',
                fontSize: '0.85rem',
              }}
            >
              <i className="bi bi-exclamation-triangle me-1"></i>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Recording state */}
      {isRecording && (
        <Card>
          <CardBody>
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                {/* Animated recording indicator */}
                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isPaused ? 'var(--neo-warning)' : 'var(--neo-danger)',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 2,
                    }}
                  />
                  {!isPaused && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          border: '2px solid var(--neo-danger)',
                          transform: 'translate(-50%, -50%)',
                          animation: 'call-pulse 1.5s ease-out infinite',
                          opacity: 0.6,
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: '2px solid var(--neo-danger)',
                          transform: 'translate(-50%, -50%)',
                          animation: 'call-pulse 1.5s ease-out infinite 0.5s',
                          opacity: 0.3,
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Timer */}
                <div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--neo-text-primary)',
                  }}>
                    {formatDuration(duration)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neo-text-secondary)' }}>
                    {isPaused ? 'En pause' : 'Enregistrement en cours...'}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="d-flex gap-2">
                {isPaused ? (
                  <button
                    className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                    onClick={resumeRecording}
                  >
                    <i className="bi bi-play-fill"></i>
                    Reprendre
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={pauseRecording}
                  >
                    <i className="bi bi-pause-fill"></i>
                    Pause
                  </button>
                )}
                <button
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  onClick={cancelRecording}
                >
                  <i className="bi bi-x-lg"></i>
                  Annuler
                </button>
                <button
                  className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                  onClick={stopRecording}
                >
                  <i className="bi bi-stop-fill"></i>
                  Arr\u00eater
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Uploading state */}
      {isUploading && (
        <Card>
          <CardBody>
            <div className="d-flex align-items-center gap-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Envoi...</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--neo-text-primary)' }}>Envoi en cours...</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>
                  Dur\u00e9e enregistr\u00e9e : {formatDuration(duration)}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Processing state */}
      {isProcessing && currentCall && (
        <Card>
          <CardBody>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="spinner-border spinner-border-sm" role="status" style={{ color: CALL_STATUS_COLORS[currentCall.status] }}>
                <span className="visually-hidden">Traitement...</span>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--neo-text-primary)' }}>
                  {CALL_STATUS_LABELS[currentCall.status]}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--neo-text-secondary)' }}>
                  L'analyse peut prendre quelques instants
                </div>
              </div>
            </div>

            {/* Progress steps */}
            <div className="d-flex gap-2">
              {(['uploading', 'transcribing', 'analyzing', 'done'] as const).map((step, idx) => {
                const steps = ['uploading', 'transcribing', 'analyzing', 'done'];
                const currentIdx = steps.indexOf(currentCall.status);
                const stepIdx = idx;
                const isComplete = stepIdx < currentIdx;
                const isCurrent = stepIdx === currentIdx;

                return (
                  <div
                    key={step}
                    className="d-flex align-items-center gap-1"
                    style={{ flex: 1 }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: isComplete
                          ? 'var(--neo-success)'
                          : isCurrent
                            ? CALL_STATUS_COLORS[currentCall.status]
                            : 'var(--neo-bg-light)',
                        color: isComplete || isCurrent ? 'var(--neo-bg-body)' : 'var(--neo-text-muted)',
                        border: `1px solid ${isComplete ? 'var(--neo-success)' : isCurrent ? CALL_STATUS_COLORS[currentCall.status] : 'var(--neo-border-color)'}`,
                        flexShrink: 0,
                      }}
                    >
                      {isComplete ? <i className="bi bi-check"></i> : idx + 1}
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      color: isCurrent ? 'var(--neo-text-primary)' : 'var(--neo-text-muted)',
                      fontWeight: isCurrent ? 600 : 400,
                      whiteSpace: 'nowrap',
                    }}>
                      {CALL_STATUS_LABELS[step]}
                    </span>
                    {idx < 3 && (
                      <div style={{
                        flex: 1,
                        height: '2px',
                        background: isComplete ? 'var(--neo-success)' : 'var(--neo-border-color)',
                        marginLeft: '4px',
                        minWidth: '8px',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Error state */}
      {isError && currentCall && (
        <Card>
          <CardBody>
            <div
              className="p-3 rounded"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-exclamation-circle-fill" style={{ color: 'var(--neo-danger)', fontSize: '1.2rem' }}></i>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--neo-danger)' }}>Erreur de traitement</div>
                  <p className="mb-2" style={{ color: 'var(--neo-text-secondary)', fontSize: '0.875rem' }}>
                    {currentCall.errorMessage || 'Une erreur est survenue lors du traitement de l\'enregistrement.'}
                  </p>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => callsService.reanalyze(currentCall.id).then(setCurrentCall)}>
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      R\u00e9essayer
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={resetWidget}>
                      <i className="bi bi-x-lg me-1"></i>
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Done: show analysis */}
      {isDone && currentCall && (
        <div>
          <div className="d-flex justify-content-end mb-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={resetWidget}
            >
              <i className="bi bi-plus-lg me-1"></i>
              Nouvel enregistrement
            </button>
          </div>
          <CallAnalysisCard call={currentCall} onApplied={onCallComplete ? () => onCallComplete(currentCall) : undefined} />
        </div>
      )}

      {/* CSS animation for pulse effect */}
      <style>{`
        @keyframes call-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default CallRecorderWidget;
