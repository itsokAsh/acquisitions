import { pgTable, uuid, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.model.js';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  owner_id: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }), // Don't allow deleting a user if they own a workspace
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
