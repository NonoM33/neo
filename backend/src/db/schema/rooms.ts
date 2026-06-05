import { pgTable, uuid, varchar, text, timestamp, pgEnum, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { products } from './products';

export const roomTypeEnum = pgEnum('room_type', [
  'salon',
  'cuisine',
  'chambre',
  'salle_de_bain',
  'bureau',
  'garage',
  'exterieur',
  'toilette',
  'entree',
  'dressing',
  'placard',
  'autre',
]);

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: roomTypeEnum('type').notNull().default('autre'),
  icon: varchar('icon', { length: 50 }),
  linkedRoomIds: jsonb('linked_room_ids').$type<string[]>().default([]).notNull(),
  floor: integer('floor').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const photos = pgTable('photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  url: text('url').notNull(),
  caption: varchar('caption', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  quantity: integer('quantity').default(1).notNull(),
  checked: boolean('checked').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type NewChecklistItem = typeof checklistItems.$inferInsert;
