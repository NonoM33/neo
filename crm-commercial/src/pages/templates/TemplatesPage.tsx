import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner } from '../../components';
import { templatesService } from '../../services';
import { useUIStore } from '../../stores';
import type { TemplateDTO, TemplateKind } from '../../types';

const KIND_META: Record<TemplateKind, { label: string; icon: string; color: string }> = {
  email: { label: 'Email', icon: 'bi-envelope-paper', color: 'var(--neo-status-proposition)' },
  document: { label: 'Document', icon: 'bi-file-earmark-pdf', color: 'var(--neo-status-gagne)' },
};

const SECTION_ORDER: { kind: TemplateKind; title: string; subtitle: string }[] = [
  { kind: 'email', title: 'Emails', subtitle: 'Messages transactionnels envoyés aux clients' },
  { kind: 'document', title: 'Documents', subtitle: 'Devis et factures générés en PDF' },
];

export function TemplatesPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);

  const load = useCallback(async () => {
    try {
      setTemplates(await templatesService.list());
    } catch (err) {
      console.error('Failed to load templates:', err);
      addToast('error', 'Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner />;

  return (
    <div className="templates-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title mb-0">
            <i className="bi bi-palette me-2"></i>
            Templates
          </h1>
          <p className="mb-0 mt-1" style={{ color: 'var(--neo-text-secondary)', fontSize: '0.9rem' }}>
            Personnalisez le contenu et le style des emails et documents
          </p>
        </div>
      </div>

      {SECTION_ORDER.map((section) => {
        const items = templates.filter((t) => t.kind === section.kind);
        if (items.length === 0) return null;
        return (
          <div key={section.kind} className="mb-4">
            <div className="nav-section mb-2">{section.title}</div>
            <div className="row g-3">
              {items.map((tpl) => {
                const meta = KIND_META[tpl.kind];
                return (
                  <div key={tpl.key} className="col-12 col-md-6 col-xl-4">
                    <Card
                      className="card-hover h-100"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/templates/${tpl.key}`)}
                    >
                      <CardBody>
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <div
                            className="d-flex align-items-center justify-content-center"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 10,
                              background: 'var(--neo-bg-light)',
                              color: meta.color,
                              fontSize: '1.3rem',
                            }}
                          >
                            <i className={`bi ${meta.icon}`}></i>
                          </div>
                          {tpl.customized ? (
                            <span className="badge" style={{ background: 'var(--neo-status-gagne)' }}>
                              Personnalisé
                            </span>
                          ) : (
                            <span className="badge border text-body-secondary">Par défaut</span>
                          )}
                        </div>
                        <h3 className="mb-1" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                          {tpl.name}
                        </h3>
                        <p
                          className="mb-0"
                          style={{ color: 'var(--neo-text-secondary)', fontSize: '0.85rem' }}
                        >
                          {tpl.description}
                        </p>
                      </CardBody>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TemplatesPage;
