import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../../components';
import { Btn, Icon, Modal, Pill } from '../../components/neo';
import type { PillTone } from '../../components/neo';
import { kbService, slugify } from '../../services/kb.service';
import {
  kbStatusLabels,
  type CreateKbArticleInput,
  type KbArticleListItem,
  type KbCategory,
  type KbStatus,
} from '../../types/kb.types';

const PAGE_SIZE = 20;

const STATUS_TONE: Record<KbStatus, PillTone> = {
  brouillon: 'neutral',
  publie: 'success',
  archive: 'dark',
};

type Tab = 'articles' | 'categories';

interface ArticleForm {
  id?: string;
  title: string;
  slug: string;
  categoryId: string;
  status: KbStatus;
  excerpt: string;
  tags: string;
  content: string;
}

const EMPTY_ARTICLE: ArticleForm = {
  title: '',
  slug: '',
  categoryId: '',
  status: 'brouillon',
  excerpt: '',
  tags: '',
  content: '',
};

interface CategoryForm {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

const EMPTY_CATEGORY: CategoryForm = { name: '', slug: '', description: '', sortOrder: 0 };

export function KbPage() {
  const [tab, setTab] = useState<Tab>('articles');

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<KbArticleListItem[]>([]);
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | KbStatus>('');
  const [categoryId, setCategoryId] = useState('');

  const [articleForm, setArticleForm] = useState<ArticleForm | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? '—' : '—');
  }, [categories]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await kbService.listCategories());
    } catch (error) {
      console.error('Failed to load KB categories:', error);
      toast.error('Impossible de charger les catégories');
    }
  }, []);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kbService.listArticles(
        {
          search: search.trim() || undefined,
          status: status || undefined,
          categoryId: categoryId || undefined,
        },
        page,
        PAGE_SIZE
      );
      setArticles(res.data);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (error) {
      console.error('Failed to load KB articles:', error);
      toast.error('Impossible de charger les articles');
    } finally {
      setLoading(false);
    }
  }, [search, status, categoryId, page]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const handle = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(handle);
  }, [search, status, categoryId]);

  useEffect(() => {
    if (tab === 'articles') loadArticles();
  }, [tab, loadArticles]);

  // ── Articles CRUD ──────────────────────────────────────────
  const submitArticle = async () => {
    if (!articleForm) return;
    if (!articleForm.title.trim() || !articleForm.content.trim()) {
      toast.error('Titre et contenu sont requis');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateKbArticleInput = {
        title: articleForm.title.trim(),
        slug: articleForm.slug.trim() || slugify(articleForm.title),
        content: articleForm.content,
        status: articleForm.status,
        excerpt: articleForm.excerpt.trim() || undefined,
        categoryId: articleForm.categoryId || undefined,
        tags: articleForm.tags
          ? articleForm.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      };
      if (articleForm.id) {
        await kbService.updateArticle(articleForm.id, {
          ...payload,
          categoryId: articleForm.categoryId || null,
        });
        toast.success('Article mis à jour');
      } else {
        await kbService.createArticle(payload);
        toast.success('Article créé');
      }
      setArticleForm(null);
      loadArticles();
    } catch (error) {
      console.error('Failed to save article:', error);
      toast.error("Échec de l'enregistrement de l'article");
    } finally {
      setSaving(false);
    }
  };

  const editArticle = async (id: string) => {
    try {
      const a = await kbService.getArticle(id);
      setArticleForm({
        id: a.id,
        title: a.title,
        slug: a.slug,
        categoryId: a.categoryId ?? '',
        status: a.status,
        excerpt: a.excerpt ?? '',
        tags: (a.tags ?? []).join(', '),
        content: a.content,
      });
    } catch (error) {
      console.error('Failed to load article:', error);
      toast.error("Impossible de charger l'article");
    }
  };

  const removeArticle = async (id: string) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      await kbService.deleteArticle(id);
      toast.success('Article supprimé');
      loadArticles();
    } catch (error) {
      console.error('Failed to delete article:', error);
      toast.error('Échec de la suppression');
    }
  };

  // ── Categories CRUD ────────────────────────────────────────
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
      if (categoryForm.id) {
        await kbService.updateCategory(categoryForm.id, payload);
        toast.success('Catégorie mise à jour');
      } else {
        await kbService.createCategory(payload);
        toast.success('Catégorie créée');
      }
      setCategoryForm(null);
      loadCategories();
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
      await kbService.deleteCategory(id);
      toast.success('Catégorie supprimée');
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Échec de la suppression');
    }
  };

  return (
    <div className="kb-page">
      <div className="page-head">
        <div className="ph-l">
          <h1>Base de connaissances</h1>
          <p>
            {tab === 'articles'
              ? `${total} article${total > 1 ? 's' : ''}`
              : `${categories.length} catégorie${categories.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="page-actions">
          {tab === 'articles' ? (
            <Btn icon="plus" onClick={() => setArticleForm({ ...EMPTY_ARTICLE })}>
              Nouvel article
            </Btn>
          ) : (
            <Btn icon="plus" onClick={() => setCategoryForm({ ...EMPTY_CATEGORY })}>
              Nouvelle catégorie
            </Btn>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="fbar">
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              variant={tab === 'articles' ? 'primary' : 'subtle'}
              size="sm"
              icon="book"
              onClick={() => setTab('articles')}
            >
              Articles
            </Btn>
            <Btn
              variant={tab === 'categories' ? 'primary' : 'subtle'}
              size="sm"
              icon="folder"
              onClick={() => setTab('categories')}
            >
              Catégories
            </Btn>
          </div>
        </div>
      </div>

      {tab === 'articles' && (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="fbar">
              <div className="fbar-search">
                <Icon name="search" size={16} />
                <input
                  type="search"
                  className="neo-field"
                  placeholder="Rechercher un article…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="neo-field"
                style={{ maxWidth: 200 }}
                value={status}
                onChange={(e) => setStatus(e.target.value as '' | KbStatus)}
              >
                <option value="">Tous les statuts</option>
                {(Object.keys(kbStatusLabels) as KbStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {kbStatusLabels[s]}
                  </option>
                ))}
              </select>
              <select
                className="neo-field"
                style={{ maxWidth: 220 }}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Catégorie</th>
                    <th>Statut</th>
                    <th>Vues</th>
                    <th>Utile</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="t-main">{a.title}</div>
                        <div className="t-sub t-mono">/{a.slug}</div>
                      </td>
                      <td className="t-sub">{a.category?.name ?? categoryName(a.categoryId)}</td>
                      <td>
                        <Pill tone={STATUS_TONE[a.status]} dot>
                          {kbStatusLabels[a.status]}
                        </Pill>
                      </td>
                      <td className="t-sub">{a.viewCount}</td>
                      <td className="t-sub">
                        {a.helpfulCount} / {a.helpfulCount + a.notHelpfulCount}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Btn variant="subtle" size="sm" icon="edit" onClick={() => editArticle(a.id)}>
                          Éditer
                        </Btn>{' '}
                        <Btn
                          variant="danger-ghost"
                          size="sm"
                          icon="trash"
                          onClick={() => removeArticle(a.id)}
                        />
                      </td>
                    </tr>
                  ))}
                  {articles.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          <span className="em-ic">
                            <Icon name="book" size={22} />
                          </span>
                          <b>Aucun article</b>
                          <p>Créez votre premier article de base de connaissances.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                    Page {page} / {totalPages}
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
            </div>
          )}
        </>
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
                      <p>Organisez vos articles en catégories.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale Article */}
      <Modal
        open={articleForm !== null}
        title={articleForm?.id ? "Modifier l'article" : 'Nouvel article'}
        onClose={() => setArticleForm(null)}
        width={720}
        footer={
          <>
            <Btn variant="subtle" onClick={() => setArticleForm(null)} disabled={saving}>
              Annuler
            </Btn>
            <Btn icon="check" onClick={submitArticle} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Btn>
          </>
        }
      >
        {articleForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label>
              <span className="field-label">Titre</span>
              <input
                className="neo-field"
                value={articleForm.title}
                onChange={(e) =>
                  setArticleForm((f) =>
                    f
                      ? {
                          ...f,
                          title: e.target.value,
                          slug: f.id ? f.slug : slugify(e.target.value),
                        }
                      : f
                  )
                }
              />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                <span className="field-label">Slug</span>
                <input
                  className="neo-field"
                  value={articleForm.slug}
                  onChange={(e) => setArticleForm((f) => (f ? { ...f, slug: e.target.value } : f))}
                />
              </label>
              <label style={{ width: 180 }}>
                <span className="field-label">Statut</span>
                <select
                  className="neo-field"
                  value={articleForm.status}
                  onChange={(e) =>
                    setArticleForm((f) => (f ? { ...f, status: e.target.value as KbStatus } : f))
                  }
                >
                  {(Object.keys(kbStatusLabels) as KbStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {kbStatusLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1 }}>
                <span className="field-label">Catégorie</span>
                <select
                  className="neo-field"
                  value={articleForm.categoryId}
                  onChange={(e) =>
                    setArticleForm((f) => (f ? { ...f, categoryId: e.target.value } : f))
                  }
                >
                  <option value="">Aucune</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                <span className="field-label">Tags (séparés par des virgules)</span>
                <input
                  className="neo-field"
                  value={articleForm.tags}
                  onChange={(e) => setArticleForm((f) => (f ? { ...f, tags: e.target.value } : f))}
                />
              </label>
            </div>
            <label>
              <span className="field-label">Extrait</span>
              <input
                className="neo-field"
                value={articleForm.excerpt}
                onChange={(e) => setArticleForm((f) => (f ? { ...f, excerpt: e.target.value } : f))}
              />
            </label>
            <label>
              <span className="field-label">Contenu (Markdown)</span>
              <textarea
                className="neo-field"
                rows={10}
                value={articleForm.content}
                onChange={(e) => setArticleForm((f) => (f ? { ...f, content: e.target.value } : f))}
              />
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
    </div>
  );
}

export default KbPage;
