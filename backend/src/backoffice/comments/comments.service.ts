import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { entityComments } from '../../db/schema';
import type { CommentEntityType } from './comments.validate';
import type { CommentView } from '../components/comments-thread';

export async function loadEntityComments(
  entityType: CommentEntityType,
  entityId: string
): Promise<CommentView[]> {
  return db
    .select({
      id: entityComments.id,
      authorId: entityComments.authorId,
      authorName: entityComments.authorName,
      content: entityComments.content,
      createdAt: entityComments.createdAt,
    })
    .from(entityComments)
    .where(and(eq(entityComments.entityType, entityType), eq(entityComments.entityId, entityId)))
    .orderBy(asc(entityComments.createdAt));
}
