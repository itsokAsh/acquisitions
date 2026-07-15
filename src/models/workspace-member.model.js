import { pgTable, uuid, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user.model.js';
import { workspaces } from './workspace.model.js';
import { roles } from './role.model.js';

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspace_id: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role_id: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => ({
    // A user can only be in a workspace once
    userWorkspaceUnique: uniqueIndex('user_workspace_unique').on(table.user_id, table.workspace_id),
  })
);
