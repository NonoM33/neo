import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Modal, Pill } from '../../components/neo';
import { kbService } from '../../services/kb.service';
import type { FaqItem, KbCategory } from '../../types/kb.types';

interface FaqForm {
  id?: string;
  question: string;
  answer: string;
  categoryId: string;
  sortOrder: number;
  isPublished: boolean;
}

const EMPTY_FAQ: FaqForm = {
  question: '',
  answer: '',
  categoryId: '',
  sortOrder: 0,
  isPublished: false,
};

export function FaqPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [form, setForm] = useState<FaqForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [faq, cats] = await Promise.all([kbService.listFaq(), kbService.listCategories()]);
      setItems(faq);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load FAQ:', error);
      toast.error('Impossible de charger la FAQ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form) return;
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question et réponse sont requises');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        categoryId: form.categoryId || undefined,
        sortOrder: form.sortOrder,
        isPublished: form.isPublished,
      };
      if (form.id) {
        await kbService.updateFaq(form.id, payload);
        toast.success('Question mise à jour');
      } else {
        await kbService.createFaq(payload);
        toast.success('Question créée');
      }
      setForm(null);
      load();
    } catch (error) {
      console.error('Failed to save FAQ:', error);
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    try {
      await kbService.deleteFaq(id);
      toast.success('Question supprimée');
      load();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      toast.error('Échec de la suppression');
    }
  };

  return (
    <div className="faq-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>FAQ</h1>
          <p>
            {items.length} question{items.length > 1 ? 's' : ''} fréquente
            {items.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="page-actions">
          <Btn icon="plus" onClick={() => setForm({ ...EMPTY_FAQ })}>
            Nouvelle question
          </Btn>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Question</th>
                <th>Ordre</th>
                <th>État</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="t-main">{f.question}</div>
                    <div className="t-sub">{f.answer}</div>
                  </td>
                  <td className="t-sub">{f.sortOrder}</td>
                  <td>
                    {f.isPublished ? (
                      <Pill tone="success" dot>
                        Publiée
                      </Pill>
                    ) : (
                      <Pill tone="neutral" dot>
                        Brouillon
                      </Pill>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Btn
                      variant="subtle"
                      size="sm"
                      icon="edit"
                      onClick={() =>
                        setForm({
                          id: f.id,
                          question: f.question,
                          answer: f.answer,
                          categoryId: f.categoryId ?? '',
                          sortOrder: f.sortOrder,
                          isPublished: f.isPublished,
                        })
                      }
                    >
                      Éditer
                    </Btn>{' '}
                    <Btn variant="danger-ghost" size="sm" icon="trash" onClick={() => remove(f.id)} />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty">
                      <span className="em-ic">
                        <Icon name="help" size={22} />
                      </span>
                      <b>Aucune question</b>
                      <p>Ajoutez les questions les plus fréquentes de vos clients.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={form !== null}
        title={form?.id ? 'Modifier la question' : 'Nouvelle question'}
        onClose={() => setForm(null)}
        width={640}
        footer={
          <>
            <Btn variant="subtle" onClick={() => setForm(null)} disabled={saving}>
              Annuler
            </Btn>
            <Btn icon="check" onClick={submit} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Btn>
          </>
        }
      >
        {form && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span className="field-label">Question</span>
              <input
                className="neo-field"
                value={form.question}
                onChange={(e) => setForm((f) => (f ? { ...f, question: e.target.value } : f))}
              />
            </label>
            <label>
              <span className="field-label">Réponse</span>
              <textarea
                className="neo-field"
                rows={6}
                value={form.answer}
                onChange={(e) => setForm((f) => (f ? { ...f, answer: e.target.value } : f))}
              />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                <span className="field-label">Catégorie</span>
                <select
                  className="neo-field"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => (f ? { ...f, categoryId: e.target.value } : f))}
                >
                  <option value="">Aucune</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ width: 140 }}>
                <span className="field-label">Ordre</span>
                <input
                  type="number"
                  className="neo-field"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, sortOrder: Number(e.target.value) } : f))
                  }
                />
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => (f ? { ...f, isPublished: e.target.checked } : f))}
              />
              <span className="field-label" style={{ margin: 0 }}>
                Publiée (visible côté client)
              </span>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FaqPage;
