import { config } from 'dotenv';
config({ path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env', override: true });
import { db } from '../config/database.js';
import { roles } from '../models/role.model.js';
import { permissions } from '../models/permission.model.js';
import { rolePermissions } from '../models/role-permission.model.js';

const systemRoles = [
  { name: 'owner', hierarchy: 100, description: 'Workspace owner with full access' },
  { name: 'admin', hierarchy: 80, description: 'Administrator with management access' },
  { name: 'member', hierarchy: 50, description: 'Regular workspace member' },
  { name: 'viewer', hierarchy: 10, description: 'Read-only access' },
];

const systemPermissions = [
  { action: 'workspace.read', description: 'View workspace details' },
  { action: 'workspace.update', description: 'Edit workspace details' },
  { action: 'workspace.delete', description: 'Delete the workspace' },
  { action: 'members.read', description: 'View workspace members' },
  { action: 'members.invite', description: 'Invite new members' },
  { action: 'members.remove', description: 'Remove members' },
  { action: 'members.update-role', description: 'Change member roles' },
];

const rolePermissionMapping = {
  'owner': ['workspace.read', 'workspace.update', 'workspace.delete', 'members.read', 'members.invite', 'members.remove', 'members.update-role'],
  'admin': ['workspace.read', 'workspace.update', 'members.read', 'members.invite', 'members.remove', 'members.update-role'],
  'member': ['workspace.read', 'members.read'],
  'viewer': ['workspace.read', 'members.read'],
};

async function seed() {
  console.log('Seeding system roles and permissions...');

  try {
    // 1. Insert permissions (upsert to avoid errors if they already exist)
    for (const perm of systemPermissions) {
      await db.insert(permissions)
        .values(perm)
        .onConflictDoNothing(); // Requires unique constraint on 'action' which we have
    }
    console.log('Permissions seeded.');

    // 2. Insert roles
    for (const role of systemRoles) {
      await db.insert(roles)
        .values(role)
        .onConflictDoNothing();
    }
    console.log('Roles seeded.');

    // 3. Map role permissions
    // Fetch all roles and perms to get their UUIDs
    const dbRoles = await db.select().from(roles);
    const dbPerms = await db.select().from(permissions);

    const roleMap = dbRoles.reduce((acc, r) => ({ ...acc, [r.name]: r.id }), {});
    const permMap = dbPerms.reduce((acc, p) => ({ ...acc, [p.action]: p.id }), {});

    for (const [roleName, actions] of Object.entries(rolePermissionMapping)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;

      for (const action of actions) {
        const permId = permMap[action];
        if (!permId) continue;

        await db.insert(rolePermissions)
          .values({ role_id: roleId, permission_id: permId })
          .onConflictDoNothing();
      }
    }
    console.log('Role-Permission mappings seeded.');
    
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
