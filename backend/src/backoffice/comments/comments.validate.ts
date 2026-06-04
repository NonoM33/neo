export const COMMENT_ENTITY_TYPES = ['client', 'project', 'lead'] as const;
export type CommentEntityType = (typeof COMMENT_ENTITY_TYPES)[number];

export const COMMENT_MAX_LENGTH = 4000;

export type CommentInput = {
  entityType?: string;
  entityId?: string;
  content?: string;
};

export type CommentValidation =
  | { ok: true; entityType: CommentEntityType; entityId: string; content: string }
  | { ok: false; status: number; error: string };

export function validateCommentInput(input: CommentInput): CommentValidation {
  const entityType = input.entityType;
  const entityId = (input.entityId ?? '').trim();
  const content = (input.content ?? '').trim();

  if (!entityType || !COMMENT_ENTITY_TYPES.includes(entityType as CommentEntityType)) {
    return { ok: false, status: 400, error: 'Type d’entité invalide' };
  }

  if (!entityId) {
    return { ok: false, status: 400, error: 'Entité manquante' };
  }

  if (!content) {
    return { ok: false, status: 400, error: 'Le commentaire est vide' };
  }

  if (content.length > COMMENT_MAX_LENGTH) {
    return { ok: false, status: 400, error: 'Le commentaire est trop long' };
  }

  return { ok: true, entityType: entityType as CommentEntityType, entityId, content };
}

export function formatAuthorName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim() || 'Utilisateur';
}
