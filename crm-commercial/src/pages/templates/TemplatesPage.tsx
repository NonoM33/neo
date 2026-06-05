import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../../components';
import { Card, Icon, Pill } from '../../components/neo';
import type { IconName } from '../../components/neo';
import { templatesService } from '../../services';
import { useUIStore } from '../../stores';
import type { TemplateDTO, TemplateKind } from '../../types';

const KIND_META: Record<TemplateKind, { label: string; icon: IconName }> = {
  email: { label: 'Email', icon: 'mail' },
  document: { label: 'Document', icon: 'fileText' },
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
    <div style={{ padding: 28 }}>
      <div className="page-head">
        <div className="ph-l">
          <h1>Templates</h1>
          <p>Personnalisez le contenu et le style des emails et documents</p>
        </div>
      </div>

      {SECTION_ORDER.map((section) => {
        const items = templates.filter((t) => t.kind === section.kind);
        if (items.length === 0) return null;
        return (
          <div key={section.kind} style={{ marginBottom: 26 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: '.05em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 12,
              }}
            >
              {section.title}
            </div>
            <div className="card-grid">
              {items.map((tpl) => {
                const meta = KIND_META[tpl.kind];
                return (
                  <div
                    key={tpl.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/templates/${tpl.key}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/templates/${tpl.key}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card className="card-hover">
                    <div className="card-body">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--r-md)',
                            display: 'grid',
                            placeItems: 'center',
                            background: 'var(--komun-soft)',
                            color: 'var(--komun)',
                          }}
                        >
                          <Icon name={meta.icon} size={20} />
                        </span>
                        {tpl.customized ? (
                          <Pill tone="success">Personnalisé</Pill>
                        ) : (
                          <Pill tone="neutral">Par défaut</Pill>
                        )}
                      </div>
                      <h3 style={{ fontSize: 15.5, fontWeight: 600, margin: '0 0 4px' }}>
                        {tpl.name}
                      </h3>
                      <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                        {tpl.description}
                      </p>
                    </div>
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
