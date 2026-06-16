import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Modal, Pill } from '../../components/neo';
import { supportSettingsService } from '../../services/support-settings.service';
import { slugify } from '../../services/kb.service';
import { ticketPriorityLabels, type TicketPriority } from '../../types/ticket.types';
import type {
  CannedResponse,
  SlaDefinition,
  TicketCategory,
} from '../../types/support-settings.types';

type Tab = 'sla' | 'categories' | 'canned';

interface SlaForm {
  id?: string;
  name: string;
  priority: '' | TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  isDefault: boolean;
}
const EMPTY_SLA: SlaForm = {
  name: '',
  priority: '',
  firstResponseMinutes: 60,
  resolutionMinutes: 480,
  isDefault: false,
};

interface CategoryForm {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}
const EMPTY_CATEGORY: CategoryForm = { name: '', slug: '', description: '', sortOrder: 0 };

interface CannedForm {
  id?: string;
  title: string;
  content: string;
  shortcut: string;
}
const EMPTY_CANNED: CannedForm = { title: '', content: '', shortcut: '' };

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

export function SupportSettingsPage() {
  const [tab, setTab] = useState<Tab>('sla');
  const [loading, setLoading] = useState(true);

  const [slas, setSlas] = useState<SlaDefinition[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [canned, setCanned] = useState<CannedResponse[]>([]);

  const [slaForm, setSlaForm] = useState<SlaForm | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [cannedForm, setCannedForm] = useState<CannedForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, r] = await Promise.all([
        supportSettingsService.listSla(),
        supportSettingsService.listCategories(),
        supportSettingsService.listCannedResponses(),
      ]);
      setSlas(s);
      setCategories(c);
      setCanned(r);
    } catch (error) {
      console.error('Failed to load support settings:', error);
      toast.error('Impossible de charger les paramètres support');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── SLA ────────────────────────────────────────────────────
  const submitSla = async () => {
    if (!slaForm) return;
    if (!slaForm.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: slaForm.name.trim(),
        priority: slaForm.priority || undefined,
        firstResponseMinutes: slaForm.firstResponseMinutes,
        resolutionMinutes: slaForm.resolutionMinutes,
        isDefault: slaForm.isDefault,
      };
      if (slaForm.id) await supportSettingsService.updateSla(slaForm.id, payload);
      else await supportSettingsService.createSla(payload);
      toast.success('SLA enregistré');
      setSlaForm(null);
      load();
    } catch (error) {
      console.error('Failed to save SLA:', error);
      toast.error("Échec de l'enregistrement du SLA");
    } finally {
      setSaving(false);
    }
  };

  const removeSla = async (id: string) => {
    if (!window.confirm('Supprimer cette définition SLA ?')) return;
    try {
      await supportSettingsService.deleteSla(id);
      toast.success('SLA supprimé');
      load();
    } catch (error) {
      console.error('Failed to delete SLA:', error);
      toast.error('Échec de la suppression');
    }
  };

  // ── Catégories ─────────────────────────────────────────────
  const submitCategory = async () => {
    if (!categoryForm) return;
    if (!categoryForm.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || slugify(categoryForm.name),
        description: categoryForm.description.trim() || undefined,
        sortOrder: categoryForm.sortOrder,
      };
      if (categoryForm.id) await supportSettingsService.updateCategory(categoryForm.id, payload);
      else await supportSettingsService.createCategory(payload);
      toast.success('Catégorie enregistrée');
      setCategoryForm(null);
      load();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error("Échec de l'enregistrement de la catégorie");
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id: string) => {
    if (!window.confirm('Supprimer cette catégorie ?')) return;
    try {
      await supportSettingsService.deleteCategory(id);
      toast.success('Catégorie supprimée');
      load();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Échec de la suppression');
    }
  };

  // ── Réponses types ─────────────────────────────────────────
  const submitCanned = async () => {
    if (!cannedForm) return;
    if (!cannedForm.title.trim() || !cannedForm.content.trim()) {
      toast.error('Titre et contenu sont requis');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: cannedForm.title.trim(),
        content: cannedForm.content,
        shortcut: cannedForm.shortcut.trim() || undefined,
      };
      if (cannedForm.id) await supportSettingsService.updateCannedResponse(cannedForm.id, payload);
      else await supportSettingsService.createCannedResponse(payload);
      toast.success('Réponse enregistrée');
      setCannedForm(null);
      load();
    } catch (error) {
      console.error('Failed to save canned response:', error);
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const removeCanned = async (id: string) => {
    if (!window.confirm('Supprimer cette réponse type ?')) return;
    try {
      await supportSettingsService.deleteCannedResponse(id);
      toast.success('Réponse supprimée');
      load();
    } catch (error) {
      console.error('Failed to delete canned response:', error);
      toast.error('Échec de la suppression');
    }
  };

  const TABS: { key: Tab; label: string; icon: 'gauge' | 'folder' | 'message' }[] = [
    { key: 'sla', label: 'SLA', icon: 'gauge' },
    { key: 'categories', label: 'Catégories', icon: 'folder' },
    { key: 'canned', label: 'Réponses types', icon: 'message' },
  ];

  return (
    <div className="support-settings-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Paramètres support</h1>
          <p>SLA, catégories de tickets et réponses pré-enregistrées</p>
        </div>
        <div className="page-actions">
          {tab === 'sla' && (
            <Btn icon="plus" onClick={() => setSlaForm({ ...EMPTY_SLA })}>
              Nouveau SLA
            </Btn>
          )}
          {tab === 'categories' && (
            <Btn icon="plus" onClick={() => setCategoryForm({ ...EMPTY_CATEGORY })}>
              Nouvelle catégorie
            </Btn>
          )}
          {tab === 'canned' && (
            <Btn icon="plus" onClick={() => setCannedForm({ ...EMPTY_CANNED })}>
              Nouvelle réponse
            </Btn>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div style={{ display: 'flex', gap: 8 }}>
            {TABS.map((t) => (
              <Btn
                key={t.key}
                variant={tab === t.key ? 'primary' : 'subtle'}
                size="sm"
                icon={t.icon}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </Btn>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {tab === 'sla' && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Priorité</th>
                    <th>1ère réponse</th>
                    <th>Résolution</th>
                    <th>Défaut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slas.map((s) => (
                    <tr key={s.id}>
                      <td className="t-main">{s.name}</td>
                      <td className="t-sub">
                        {s.priority ? ticketPriorityLabels[s.priority] : 'Toutes'}
                      </td>
                      <td className="t-sub">{formatDuration(s.firstResponseMinutes)}</td>
                      <td className="t-sub">{formatDuration(s.resolutionMinutes)}</td>
                      <td>{s.isDefault && <Pill tone="success">Défaut</Pill>}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Btn
                          variant="subtle"
                          size="sm"
                          icon="edit"
                          onClick={() =>
                            setSlaForm({
                              id: s.id,
                              name: s.name,
                              priority: s.priority ?? '',
                              firstResponseMinutes: s.firstResponseMinutes,
                              resolutionMinutes: s.resolutionMinutes,
                              isDefault: s.isDefault,
                            })
                          }
                        >
                          Éditer
                        </Btn>{' '}
                        <Btn variant="danger-ghost" size="sm" icon="trash" onClick={() => removeSla(s.id)} />
                      </td>
                    </tr>
                  ))}
                  {slas.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          <span className="em-ic">
                            <Icon name="gauge" size={22} />
                          </span>
                          <b>Aucun SLA</b>
                          <p>Définissez les délais de réponse et de résolution.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'categories' && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Slug</th>
                    <th>Ordre</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="t-main">{c.name}</div>
                        {c.description && <div className="t-sub">{c.description}</div>}
                      </td>
                      <td className="t-sub t-mono">{c.slug}</td>
                      <td className="t-sub">{c.sortOrder}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Btn
                          variant="subtle"
                          size="sm"
                          icon="edit"
                          onClick={() =>
                            setCategoryForm({
                              id: c.id,
                              name: c.name,
                              slug: c.slug,
                              description: c.description ?? '',
                              sortOrder: c.sortOrder,
                            })
                          }
                        >
                          Éditer
                        </Btn>{' '}
                        <Btn
                          variant="danger-ghost"
                          size="sm"
                          icon="trash"
                          onClick={() => removeCategory(c.id)}
                        />
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">
                          <span className="em-ic">
                            <Icon name="folder" size={22} />
                          </span>
                          <b>Aucune catégorie</b>
                          <p>Classez vos tickets par catégorie.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'canned' && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Raccourci</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {canned.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="t-main">{r.title}</div>
                        <div className="t-sub">{r.content}</div>
                      </td>
                      <td className="t-sub t-mono">{r.shortcut ?? '—'}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Btn
                          variant="subtle"
                          size="sm"
                          icon="edit"
                          onClick={() =>
                            setCannedForm({
                              id: r.id,
                              title: r.title,
                              content: r.content,
                              shortcut: r.shortcut ?? '',
                            })
                          }
                        >
                          Éditer
                        </Btn>{' '}
                        <Btn
                          variant="danger-ghost"
                          size="sm"
                          icon="trash"
                          onClick={() => removeCanned(r.id)}
                        />
                      </td>
                    </tr>
                  ))}
                  {canned.length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <div className="empty">
                          <span className="em-ic">
                            <Icon name="message" size={22} />
                          </span>
                          <b>Aucune réponse type</b>
                          <p>Gagnez du temps avec des réponses pré-rédigées.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modale SLA */}
      <Modal
        open={slaForm !== null}
        title={slaForm?.id ? 'Modifier le SLA' : 'Nouveau SLA'}
        onClose={() => setSlaForm(null)}
        footer={
          <>
            <Btn variant="subtle" onClick={() => setSlaForm(null)} disabled={saving}>
              Annuler
            </Btn>
            <Btn icon="check" onClick={submitSla} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Btn>
          </>
        }
      >
        {slaForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span className="field-label">Nom</span>
              <input
                className="neo-field"
                value={slaForm.name}
                onChange={(e) => setSlaForm((f) => (f ? { ...f, name: e.target.value } : f))}
              />
            </label>
            <label>
              <span className="field-label">Priorité ciblée</span>
              <select
                className="neo-field"
                value={slaForm.priority}
                onChange={(e) =>
                  setSlaForm((f) => (f ? { ...f, priority: e.target.value as '' | TicketPriority } : f))
                }
              >
                <option value="">Toutes les priorités</option>
                {(Object.keys(ticketPriorityLabels) as TicketPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {ticketPriorityLabels[p]}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                <span className="field-label">1ère réponse (minutes)</span>
                <input
                  type="number"
                  className="neo-field"
                  value={slaForm.firstResponseMinutes}
                  onChange={(e) =>
                    setSlaForm((f) =>
                      f ? { ...f, firstResponseMinutes: Number(e.target.value) } : f
                    )
                  }
                />
              </label>
              <label style={{ flex: 1 }}>
                <span className="field-label">Résolution (minutes)</span>
                <input
                  type="number"
                  className="neo-field"
                  value={slaForm.resolutionMinutes}
                  onChange={(e) =>
                    setSlaForm((f) => (f ? { ...f, resolutionMinutes: Number(e.target.value) } : f))
                  }
                />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={slaForm.isDefault}
                onChange={(e) => setSlaForm((f) => (f ? { ...f, isDefault: e.target.checked } : f))}
              />
              <span className="field-label" style={{ margin: 0 }}>
                SLA par défaut
              </span>
            </label>
          </div>
        )}
      </Modal>

      {/* Modale Catégorie */}
      <Modal
        open={categoryForm !== null}
        title={categoryForm?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        onClose={() => setCategoryForm(null)}
        footer={
          <>
            <Btn variant="subtle" onClick={() => setCategoryForm(null)} disabled={saving}>
              Annuler
            </Btn>
            <Btn icon="check" onClick={submitCategory} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Btn>
          </>
        }
      >
        {categoryForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span className="field-label">Nom</span>
              <input
                className="neo-field"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((f) =>
                    f
                      ? { ...f, name: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) }
                      : f
                  )
                }
              />
            </label>
            <label>
              <span className="field-label">Slug</span>
              <input
                className="neo-field"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm((f) => (f ? { ...f, slug: e.target.value } : f))}
              />
            </label>
            <label>
              <span className="field-label">Description</span>
              <input
                className="neo-field"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((f) => (f ? { ...f, description: e.target.value } : f))
                }
              />
            </label>
            <label style={{ width: 160 }}>
              <span className="field-label">Ordre d'affichage</span>
              <input
                type="number"
                className="neo-field"
                value={categoryForm.sortOrder}
                onChange={(e) =>
                  setCategoryForm((f) => (f ? { ...f, sortOrder: Number(e.target.value) } : f))
                }
              />
            </label>
          </div>
        )}
      </Modal>

      {/* Modale Réponse type */}
      <Modal
        open={cannedForm !== null}
        title={cannedForm?.id ? 'Modifier la réponse' : 'Nouvelle réponse type'}
        onClose={() => setCannedForm(null)}
        width={640}
        footer={
          <>
            <Btn variant="subtle" onClick={() => setCannedForm(null)} disabled={saving}>
              Annuler
            </Btn>
            <Btn icon="check" onClick={submitCanned} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Btn>
          </>
        }
      >
        {cannedForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span className="field-label">Titre</span>
              <input
                className="neo-field"
                value={cannedForm.title}
                onChange={(e) => setCannedForm((f) => (f ? { ...f, title: e.target.value } : f))}
              />
            </label>
            <label>
              <span className="field-label">Raccourci (optionnel)</span>
              <input
                className="neo-field"
                placeholder="ex: /merci"
                value={cannedForm.shortcut}
                onChange={(e) => setCannedForm((f) => (f ? { ...f, shortcut: e.target.value } : f))}
              />
            </label>
            <label>
              <span className="field-label">Contenu</span>
              <textarea
                className="neo-field"
                rows={8}
                value={cannedForm.content}
                onChange={(e) => setCannedForm((f) => (f ? { ...f, content: e.target.value } : f))}
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SupportSettingsPage;
