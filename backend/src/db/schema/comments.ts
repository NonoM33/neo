import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';

// Entités auxquelles un fil de commentaires interne peut être rattaché.
export const commentEntityTypeEnum = pgEnum('comment_entity_type', ['client', 'project', 'lead']);

// Commentaires internes (notes type chat) partagés entre commerciaux.
// Polymorphe : (entityType, entityId) pointe vers un client, un projet ou un lead.
export const entityComments = pgTable(
  'entity_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: commentEntityTypeEnum('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    // Snapshot du nom de l'auteur au moment de l'écriture : reste lisible même
    // si le compte est supprimé ou renommé plus tard.
    authorName: varchar('author_name', { length: 201 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index('entity_comments_entity_idx').on(table.entityType, table.entityId),
  })
);

export type EntityComment = typeof entityComments.$inferSelect;
export type NewEntityComment = typeof entityComments.$inferInsert;
export type CommentEntityType = (typeof commentEntityTypeEnum.enumValues)[number];
