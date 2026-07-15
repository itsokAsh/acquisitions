import { pgTable, uuid, timestamp, varchar, text, boolean, integer } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
  is_system: boolean('is_system').default(true).notNull(),
  hierarchy: integer('hierarchy').notNull(), // Lower number = lower privilege (e.g. viewer=10, admin=80)
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
