import { pgTable, uuid, timestamp, varchar, text } from 'drizzle-orm/pg-core';
import { users } from './user.model.js';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Which user owns this token
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // SHA-256 hash of the raw token (never store raw tokens in DB)
  token_hash: varchar('token_hash', { length: 255 }).notNull(),

  // Family ID groups all tokens from the same login session.
  // When a token is rotated, the new token gets the SAME family_id.
  // This is the key to reuse detection — if a revoked token from
  // this family is used, we revoke the ENTIRE family.
  family_id: uuid('family_id').notNull(),

  // Metadata for session management UI ("Chrome on Windows", etc.)
  device_info: text('device_info'),
  ip_address: varchar('ip_address', { length: 45 }),

  // Token lifecycle
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }), // NULL = active
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
