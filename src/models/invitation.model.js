import { pgTable, uuid, timestamp, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces } from './workspace.model.js';
import { roles } from './role.model.js';
import { users } from './user.model.js';

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role_id: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    invited_by: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token_hash: varchar('token_hash', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'accepted'
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    // A user can only have one pending invite per workspace at a time
    workspaceEmailUnique: uniqueIndex('workspace_email_unique').on(table.workspace_id, table.email),
  })
);
