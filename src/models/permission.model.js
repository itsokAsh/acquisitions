import { pgTable, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: varchar('action', { length: 100 }).notNull().unique(), // e.g. 'members.invite'
  description: text('description'),
});
