import type { FC } from 'hono/jsx';
import type { CommentEntityType } from '../comments/comments.validate';

export interface CommentView {
  id: string;
  authorId: string | null;
  authorName: string;
  content: string;
  createdAt: Date | string;
}

interface CommentItemProps {
  comment: CommentView;
  canDelete: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return '?';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

function formatDateTime(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CommentItem: FC<CommentItemProps> = ({ comment, canDelete }) => (
  <div class="cmt-item">
    <div class="cmt-avatar">{initials(comment.authorName)}</div>
    <div class="cmt-bubble">
      <div class="cmt-meta">
        <span class="cmt-author">{comment.authorName}</span>
        <span class="cmt-date">{formatDateTime(comment.createdAt)}</span>
        {canDelete && (
          <button
            type="button"
            class="cmt-delete"
            title="Supprimer"
            hx-delete={`/backoffice/comments/${comment.id}`}
            hx-target="closest .cmt-item"
            hx-swap="outerHTML"
            hx-confirm="Supprimer ce commentaire ?"
          >
            <i class="bi bi-trash"></i>
          </button>
        )}
      </div>
      <div class="cmt-content">{comment.content}</div>
    </div>
  </div>
);

interface CommentsThreadProps {
  entityType: CommentEntityType;
  entityId: string;
  comments: CommentView[];
  currentUserId: string;
  canModerate: boolean;
}

export const CommentsThread: FC<CommentsThreadProps> = ({
  entityType,
  entityId,
  comments,
  currentUserId,
  canModerate,
}) => (
  <div class="card mb-4 confidential">
    <style>{`
      .cmt-list {
        max-height: 360px;
        overflow-y: auto;
        padding: 12px 16px;
        background: #f8f9fa;
      }
      .cmt-item { display: flex; gap: 10px; margin-bottom: 14px; }
      .cmt-item:last-child { margin-bottom: 0; }
      .cmt-avatar {
        flex: 0 0 auto;
        width: 34px; height: 34px;
        border-radius: 50%;
        background: var(--primary-color, #0d6efd);
        color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem; font-weight: 600;
      }
      .cmt-bubble {
        flex: 1 1 auto;
        background: #fff;
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 8px 12px;
      }
      .cmt-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
      .cmt-author { font-weight: 600; font-size: 0.82rem; }
      .cmt-date { font-size: 0.7rem; color: #adb5bd; }
      .cmt-delete {
        margin-left: auto;
        border: none; background: none; color: #ced4da;
        padding: 0 2px; line-height: 1; cursor: pointer; font-size: 0.8rem;
      }
      .cmt-delete:hover { color: #dc3545; }
      .cmt-content { font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; color: #212529; }
      .cmt-empty { text-align: center; color: #adb5bd; font-size: 0.82rem; padding: 24px 8px; }
      .cmt-form { padding: 12px 16px; border-top: 1px solid #e9ecef; background: #fff; border-radius: 0 0 10px 10px; }
    `}</style>

    <div class="card-header d-flex justify-content-between align-items-center">
      <span>
        <i class="bi bi-chat-left-text me-2"></i>Notes internes
        <span class="badge bg-secondary ms-2">{comments.length}</span>
      </span>
      <span class="badge bg-warning-subtle text-warning-emphasis" title="Masqué en Mode RDV">
        <i class="bi bi-eye-slash me-1"></i>Confidentiel
      </span>
    </div>

    <div class="cmt-list" id="cmt-list">
      {comments.length === 0 ? (
        <div class="cmt-empty" id="cmt-empty">
          <i class="bi bi-chat-dots d-block mb-1" style="font-size:1.5rem;"></i>
          Aucune note pour le moment
        </div>
      ) : (
        comments.map((c) => (
          <CommentItem comment={c} canDelete={canModerate || c.authorId === currentUserId} />
        ))
      )}
    </div>

    <form
      class="cmt-form"
      hx-post="/backoffice/comments"
      hx-target="#cmt-list"
      hx-swap="beforeend"
      hx-on--after-request="if(event.detail.successful){this.reset();var e=document.getElementById('cmt-empty');if(e)e.remove();var l=document.getElementById('cmt-list');if(l)l.scrollTop=l.scrollHeight;}"
    >
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <div class="input-group">
        <textarea
          name="content"
          class="form-control"
          rows={1}
          placeholder="Ajouter une note pour l'équipe…"
          required
          style="resize: vertical;"
        ></textarea>
        <button type="submit" class="btn btn-primary">
          <i class="bi bi-send"></i>
        </button>
      </div>
    </form>
  </div>
);
