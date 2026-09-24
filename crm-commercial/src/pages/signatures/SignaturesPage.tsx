import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Card, Pill, type PillTone } from '../../components/neo';
import { signaturesService } from '../../services';
import type {
  SignatureListItem,
  SignatureMode,
  SignatureStatus,
} from '../../types/signature.types';

const STATUS_META: Record<SignatureStatus, { label: string; tone: PillTone }> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  pending: { label: 'En attente', tone: 'info' },
  signed: { label: 'Signé', tone: 'success' },
  declined: { label: 'Refusé', tone: 'danger' },
  expired: { label: 'Expiré', tone: 'warning' },
  cancelled: { label: 'Annulé', tone: 'neutral' },
};

const MODE_LABELS: Record<SignatureMode, string> = {
  remote: 'À distance (DocuSeal)',
  direct: 'En personne',
};

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const PAGE_SIZE = 20;

export function SignaturesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SignatureListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SignatureStatus | ''>('');
  const [mode, setMode] = useState<SignatureMode | ''>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await signaturesService.list({
          status: status || undefined,
          mode: mode || undefined,
          page,
          pageSize: PAGE_SIZE,
        });
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error('Failed to load signatures:', error);
        if (!cancelled) toast.error('Impossible de charger les signatures');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, mode, page]);

  const signedCount = rows.filter((r) => r.status === 'signed').length;
  const pendingCount = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="signatures-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Signatures</h1>
          <p>Suivi des demandes de signature de devis (à distance et en personne).</p>
        </div>
      </div>

      <div className="stat-grid mb-22">
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Total (filtré)</span>
          </div>
          <div className="st-val">{total}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">Signées (page)</span>
          </div>
          <div className="st-val">{signedCount}</div>
        </div>
        <div className="stat">
          <div className="st-top">
            <span className="st-label">En attente (page)</span>
          </div>
          <div className="st-val">{pendingCount}</div>
        </div>
      </div>

      <Card>
        <div className="fbar">
          <select
            className="neo-field"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as SignatureStatus | '');
            }}
            style={{ width: 180 }}
          >
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS_META) as SignatureStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            className="neo-field"
            value={mode}
            onChange={(e) => {
              setPage(1);
              setMode(e.target.value as SignatureMode | '');
            }}
            style={{ width: 200 }}
          >
            <option value="">Tous les modes</option>
            {(Object.keys(MODE_LABELS) as SignatureMode[]).map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </select>
          {(status || mode) && (
            <Btn
              variant="subtle"
              icon="x"
              onClick={() => {
                setPage(1);
                setStatus('');
                setMode('');
              }}
            >
              Réinitialiser
            </Btn>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <div className="empty">Aucune signature trouvée.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Devis</th>
                  <th>Signataire</th>
                  <th>Mode</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Montant</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const meta = STATUS_META[s.status];
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link to={`/devis/${s.quoteId}`} className="t-main">
                          {s.quoteNumber ?? s.quoteId.slice(0, 8)}
                        </Link>
                        {s.clientName && <div className="t-sub">{s.clientName}</div>}
                      </td>
                      <td>
                        <div className="t-main">{s.signerName}</div>
                        <div className="t-sub">{s.signerEmail}</div>
                      </td>
                      <td>{MODE_LABELS[s.mode] ?? s.mode}</td>
                      <td>
                        <Pill tone={meta.tone}>{meta.label}</Pill>
                      </td>
                      <td className="t-mono" style={{ textAlign: 'right' }}>
                        {s.totalTTC ? euro.format(parseFloat(s.totalTTC)) : '—'}
                      </td>
                      <td className="t-sub">
                        {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/devis/${s.quoteId}`} title="Voir le devis">
                          <Btn variant="ghost" size="sm" icon="arrowRight" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 14,
            }}
          >
            <span className="t-sub">
              Page {page} / {totalPages} · {total} demande{total > 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn
                variant="subtle"
                size="sm"
                icon="arrowLeft"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Btn>
              <Btn
                variant="subtle"
                size="sm"
                iconRight="arrowRight"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default SignaturesPage;
