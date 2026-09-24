import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import grapesjs, { type Editor } from 'grapesjs';
import presetNewsletter from 'grapesjs-preset-newsletter';
import 'grapesjs/dist/css/grapes.min.css';
import { Spinner } from '../../components';
import { Btn, Icon } from '../../components/neo';
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
    <div
      style={{ padding: 28, height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Toolbar */}
      <div className="page-head">
        <div className="ph-l">
          <button className="back-link" onClick={() => navigate('/templates')}>
            <Icon name="arrowLeft" size={15} /> Retour aux templates
          </button>
          <h1 style={{ fontSize: 21 }}>{template.name}</h1>
          <p>{template.description}</p>
        </div>
        <div className="page-actions">
          <Btn variant="danger-ghost" size="sm" icon="arrowLeft" onClick={handleReset}>
            Réinitialiser
          </Btn>
          <Btn variant="subtle" size="sm" icon="eyeOff" onClick={handlePreview}>
            Aperçu
          </Btn>
          <Btn size="sm" icon="check" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Btn>
        </div>
      </div>

      {/* Subject (emails only) */}
      {template.kind === 'email' && (
        <div style={{ marginBottom: 16 }}>
          <label className="field-label" htmlFor="template-subject">
            Objet de l'email
          </label>
          <input
            id="template-subject"
            type="text"
            className="neo-field"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet (les variables {{...}} sont autorisées)"
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Variable palette */}
        <div
          style={{
            width: 240,
            flexShrink: 0,
            overflowY: 'auto',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: '.05em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 8,
            }}
          >
            Variables
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Cliquez pour copier, puis collez dans le contenu.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {template.variables.map((v) => (
              <button
                key={v.token}
                type="button"
                style={{
                  textAlign: 'left',
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--r-sm)',
                  padding: '7px 10px',
                  cursor: 'pointer',
                }}
                title={v.hint ?? v.token}
                onClick={() => copyToken(v.token)}
              >
                <code
                  style={{ color: 'var(--komun)', fontSize: 12.5, fontFamily: 'var(--font-mono)' }}
                >{`{{${v.token}}}`}</code>
                <div style={{ color: 'var(--ink-3)', fontSize: 11.5, marginTop: 2 }}>{v.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* GrapesJS editor */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
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
              background: 'var(--card)',
              borderRadius: 'var(--r-lg)',
              width: 'min(900px, 100%)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div>
                <strong>Aperçu</strong>
                {template.kind === 'email' && previewSubject && (
                  <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Objet : {previewSubject}</div>
                )}
              </div>
              <Btn variant="subtle" size="sm" icon="x" onClick={() => setPreviewHtml(null)} />
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
