import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { roles } from './role.model.js';
import { permissions } from './permission.model.js';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  table => ({
    pk: primaryKey({ columns: [table.role_id, table.permission_id] }),
  })
);
