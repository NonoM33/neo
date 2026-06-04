import { pgTable, uuid, varchar, timestamp, pgEnum, boolean, jsonb } from 'drizzle-orm/pg-core';

// Legacy single role enum (kept for backward compatibility during migration)
export const userRoleEnum = pgEnum('user_role', ['admin', 'integrateur', 'auditeur']);

// Legacy role-type enum. The roles.name column is now free-form varchar so that
// admins can create custom roles; this enum is kept only for the built-in role
// names referenced in code (admin/integrateur/auditeur/commercial).
export const roleTypeEnum = pgEnum('role_type', ['admin', 'integrateur', 'auditeur', 'commercial']);

// Roles table - defines available roles in the system.
// `name` is free-form so admins can create custom roles; `permissions` holds the
// ticked permission keys (see modules/roles/permissions.ts); `isSystem` protects
// the built-in roles from deletion/rename.
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: userRoleEnum('role').notNull().default('integrateur'), // Legacy field
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User roles junction table - enables multi-role support
export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// Role type for use in JWT and authorization
export type RoleType = 'admin' | 'integrateur' | 'auditeur' | 'commercial';

// Role labels for display
export const roleLabels: Record<RoleType, string> = {
  admin: 'Administrateur',
  integrateur: 'Intégrateur',
  auditeur: 'Auditeur',
  commercial: 'Commercial',
};
