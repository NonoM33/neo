import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import grapesjs, { type Editor } from 'grapesjs';
import presetNewsletter from 'grapesjs-preset-newsletter';
import 'grapesjs/dist/css/grapes.min.css';
import { Spinner } from '../../components';
import { templatesService } from '../../services';
import { useUIStore } from '../../stores';
import type { TemplateDTO } from '../../types';

/** Compose a full standalone HTML document from the editor body + CSS. */
function composeHtml(editor: Editor): string {
  const inner = editor.getHtml();
  const css = editor.getCss();
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${css ?? ''}</style>
</head>
<body>${inner}</body>
</html>`;
}

export function TemplateEditorPage() {
  const { key = '' } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<TemplateDTO | null>(null);
  const [subject, setSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState('');

  // Load the template, then mount GrapesJS once the container is in the DOM.
  useEffect(() => {
    let cancelled = false;
    let editor: Editor | null = null;

    (async () => {
      try {
        const tpl = await templatesService.get(key);
        if (cancelled) return;
        setTemplate(tpl);
        setSubject(tpl.subject ?? '');
        setLoading(false);

        // Wait a tick so the container ref is rendered.
        requestAnimationFrame(() => {
          if (cancelled || !containerRef.current) return;
          editor = grapesjs.init({
            container: containerRef.current,
            height: '100%',
            fromElement: false,
            storageManager: false,
            plugins: [presetNewsletter],
            pluginsOpts: {
              [presetNewsletter as unknown as string]: {
                modalLabelImport: 'Coller le code HTML',
                modalLabelExport: 'Code HTML à copier',
                importPlaceholder: '<table>...</table>',
              },
            },
          });
          editorRef.current = editor;

          if (tpl.gjsData) {
            editor.loadProjectData(tpl.gjsData as object);
          } else {
            editor.setComponents(tpl.html);
          }
        });
      } catch (err) {
        console.error('Failed to load template:', err);
        if (!cancelled) {
          addToast('error', 'Erreur lors du chargement du template');
          navigate('/templates');
        }
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [key, navigate, addToast]);

  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !template) return;
    setSaving(true);
    try {
      const updated = await templatesService.update(key, {
        html: composeHtml(editor),
        subject: template.kind === 'email' ? subject : undefined,
        gjsData: editor.getProjectData(),
      });
      setTemplate(updated);
      addToast('success', 'Template enregistré');
    } catch (err) {
      console.error('Failed to save template:', err);
      addToast('error', "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, [key, subject, template, addToast]);

  const handlePreview = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !template) return;
    try {
      const preview = await templatesService.preview(key, {
        html: composeHtml(editor),
        subject: template.kind === 'email' ? subject : undefined,
      });
      setPreviewHtml(preview.html);
      setPreviewSubject(preview.subject);
    } catch (err) {
      console.error('Failed to preview template:', err);
      addToast('error', "Échec de l'aperçu");
    }
  }, [key, subject, template, addToast]);

  const handleReset = useCallback(async () => {
    if (!window.confirm('Revenir au template par défaut ? Vos modifications seront perdues.')) {
      return;
    }
    try {
      const reset = await templatesService.reset(key);
      editorRef.current?.setComponents(reset.html);
      editorRef.current?.setStyle('');
      setTemplate(reset);
      setSubject(reset.subject ?? '');
      addToast('success', 'Template réinitialisé');
    } catch (err) {
      console.error('Failed to reset template:', err);
      addToast('error', 'Échec de la réinitialisation');
    }
  }, [key, addToast]);

  const copyToken = useCallback(
    (token: string) => {
      navigator.clipboard
        .writeText(`{{${token}}}`)
        .then(() => addToast('success', `{{${token}}} copié`))
        .catch(() => addToast('error', 'Impossible de copier'));
    },
    [addToast],
  );

  if (loading || !template) return <Spinner />;

  return (
    <div className="template-editor-page d-flex flex-column" style={{ height: 'calc(100vh - 70px)' }}>
      {/* Toolbar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/templates')}>
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <h1 className="page-title mb-0" style={{ fontSize: '1.2rem' }}>
              {template.name}
            </h1>
            <span style={{ color: 'var(--neo-text-secondary)', fontSize: '0.8rem' }}>
              {template.description}
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-danger btn-sm" onClick={handleReset}>
            <i className="bi bi-arrow-counterclockwise me-1"></i>
            Réinitialiser
          </button>
          <button className="btn btn-outline-primary btn-sm" onClick={handlePreview}>
            <i className="bi bi-eye me-1"></i>
            Aperçu
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            <i className="bi bi-save me-1"></i>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Subject (emails only) */}
      {template.kind === 'email' && (
        <div className="mb-3">
          <label className="form-label mb-1" style={{ fontSize: '0.85rem' }}>
            Objet de l'email
          </label>
          <input
            type="text"
            className="form-control"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet (les variables {{...}} sont autorisées)"
          />
        </div>
      )}

      <div className="d-flex gap-3" style={{ flex: 1, minHeight: 0 }}>
        {/* Variable palette */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            overflowY: 'auto',
            background: 'var(--neo-bg-card)',
            border: '1px solid var(--neo-border-color)',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div className="nav-section mb-2">Variables</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--neo-text-secondary)' }}>
            Cliquez pour copier, puis collez dans le contenu.
          </p>
          <div className="d-flex flex-column gap-1">
            {template.variables.map((v) => (
              <button
                key={v.token}
                className="btn btn-sm text-start"
                style={{
                  background: 'var(--neo-bg-light)',
                  border: '1px solid var(--neo-border-color)',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                }}
                title={v.hint ?? v.token}
                onClick={() => copyToken(v.token)}
              >
                <code style={{ color: 'var(--neo-primary)' }}>{`{{${v.token}}}`}</code>
                <div style={{ color: 'var(--neo-text-secondary)', fontSize: '0.72rem' }}>
                  {v.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* GrapesJS editor */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--neo-border-color)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <div ref={containerRef} style={{ height: '100%' }} />
        </div>
      </div>

      {/* Preview modal */}
      {previewHtml !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1080,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setPreviewHtml(null)}
        >
          <div
            style={{
              background: 'var(--neo-bg-card)',
              borderRadius: 12,
              width: 'min(900px, 100%)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <div>
                <strong>Aperçu</strong>
                {template.kind === 'email' && previewSubject && (
                  <div style={{ color: 'var(--neo-text-secondary)', fontSize: '0.85rem' }}>
                    Objet : {previewSubject}
                  </div>
                )}
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setPreviewHtml(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <iframe
              title="Aperçu du template"
              srcDoc={previewHtml}
              style={{ flex: 1, border: 'none', width: '100%', background: '#fff', minHeight: '60vh' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateEditorPage;
