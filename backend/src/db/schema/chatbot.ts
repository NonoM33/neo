import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { leads } from './crm';

// ============ Enums ============

// Statut d'une conversation du chatbot du site vitrine.
export const chatbotSessionStatusEnum = pgEnum('chatbot_session_status', [
  'active',
  'closed',
]);

// Qui répond actuellement dans la conversation : le bot IA ou un agent humain.
export const chatbotModeEnum = pgEnum('chatbot_mode', ['bot', 'human']);

// Auteur d'un message. `system` = messages techniques (prise en main, clôture).
export const chatbotMessageRoleEnum = pgEnum('chatbot_message_role', [
  'visitor',
  'bot',
  'staff',
  'system',
]);

// ============ Sessions ============

export const chatbotSessions = pgTable('chatbot_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Identifiant anonyme généré côté navigateur (localStorage), pour reprendre
  // une conversation entre rechargements de page.
  visitorId: varchar('visitor_id', { length: 100 }).notNull(),
  status: chatbotSessionStatusEnum('status').notNull().default('active'),
  mode: chatbotModeEnum('mode').notNull().default('bot'),
  // Agent staff ayant pris la main sur la conversation, le cas échéant.
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  // Coordonnées collectées par le bot au fil de la conversation.
  visitorName: varchar('visitor_name', { length: 200 }),
  visitorEmail: varchar('visitor_email', { length: 255 }),
  visitorPhone: varchar('visitor_phone', { length: 30 }),
  // Lead CRM créé lorsqu'un RDV est capturé.
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  pageUrl: text('page_url'),
  userAgent: text('user_agent'),
  // Compteur de messages non lus côté staff (remis à zéro à l'ouverture).
  unreadForStaff: integer('unread_for_staff').notNull().default(0),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
});

// ============ Messages ============

export const chatbotMessages = pgTable('chatbot_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => chatbotSessions.id, { onDelete: 'cascade' }),
  role: chatbotMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  // Renseigné lorsque le message provient d'un agent humain.
  authorStaffId: uuid('author_staff_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ Type Exports ============

export type ChatbotSession = typeof chatbotSessions.$inferSelect;
export type NewChatbotSession = typeof chatbotSessions.$inferInsert;
export type ChatbotMessage = typeof chatbotMessages.$inferSelect;
export type NewChatbotMessage = typeof chatbotMessages.$inferInsert;
