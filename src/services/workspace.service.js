import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { eq, and } from 'drizzle-orm';
import { workspaces } from '#models/workspace.model.js';
import { workspaceMembers } from '#models/workspace-member.model.js';
import { roles } from '#models/role.model.js';
import { users } from '#models/user.model.js';

// Helper to generate a URL-friendly slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);
};

export const createWorkspace = async (name, userId) => {
  try {
    const slug = generateSlug(name);
    
    // Get the owner role id
    const [ownerRole] = await db.select().from(roles).where(eq(roles.name, 'owner')).limit(1);
    
    if (!ownerRole) throw new Error('System roles not seeded');

    // Create workspace and add owner in a transaction
    return await db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name,
          slug,
          owner_id: userId,
        })
        .returning();

      await tx.insert(workspaceMembers).values({
        user_id: userId,
        workspace_id: workspace.id,
        role_id: ownerRole.id,
      });

      return workspace;
    });
  } catch (error) {
    logger.error('Error creating workspace:', error);
    throw new Error('Error creating workspace', { cause: error });
  }
};

export const getUserWorkspaces = async (userId) => {
  try {
    return await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: roles.name,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspace_id, workspaces.id))
      .innerJoin(roles, eq(workspaceMembers.role_id, roles.id))
      .where(eq(workspaceMembers.user_id, userId));
  } catch (error) {
    logger.error('Error fetching user workspaces:', error);
    throw new Error('Error fetching user workspaces', { cause: error });
  }
};

export const getWorkspaceById = async (workspaceId) => {
  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return workspace;
  } catch (error) {
    logger.error('Error fetching workspace:', error);
    throw new Error('Error fetching workspace', { cause: error });
  }
};

export const updateWorkspace = async (workspaceId, data) => {
  try {
    const updateData = { ...data, updated_at: new Date() };
    if (data.name) {
       // Only regenerate slug if name changes and we want to keep it in sync, though usually slugs are permanent.
       // We'll skip slug updates for simplicity unless explicitly required.
    }

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set(updateData)
      .where(eq(workspaces.id, workspaceId))
      .returning();
      
    return updatedWorkspace;
  } catch (error) {
    logger.error('Error updating workspace:', error);
    throw new Error('Error updating workspace', { cause: error });
  }
};

export const deleteWorkspace = async (workspaceId) => {
  try {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    return true;
  } catch (error) {
    logger.error('Error deleting workspace:', error);
    throw new Error('Error deleting workspace', { cause: error });
  }
};

export const getWorkspaceMembers = async (workspaceId) => {
  try {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: roles.name,
        joined_at: workspaceMembers.created_at,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.user_id, users.id))
      .innerJoin(roles, eq(workspaceMembers.role_id, roles.id))
      .where(eq(workspaceMembers.workspace_id, workspaceId));
  } catch (error) {
    logger.error('Error fetching workspace members:', error);
    throw new Error('Error fetching workspace members', { cause: error });
  }
};

export const removeMember = async (workspaceId, userIdToRemove) => {
  try {
    // Prevent removing the owner
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (workspace.owner_id === userIdToRemove) {
       throw new Error('Cannot remove the workspace owner');
    }

    await db.delete(workspaceMembers).where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, userIdToRemove)
      )
    );
    return true;
  } catch (error) {
    logger.error('Error removing member:', error);
    throw error;
  }
};

export const updateMemberRole = async (workspaceId, userIdToUpdate, newRoleId, currentRoleHierarchy) => {
  try {
    // Prevent updating the owner's role
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
    if (workspace.owner_id === userIdToUpdate) {
       throw new Error('Cannot change the role of the workspace owner');
    }

    // Check if new role hierarchy is higher or equal to current user's hierarchy
    const [newRole] = await db.select().from(roles).where(eq(roles.id, newRoleId));
    if (newRole.hierarchy >= currentRoleHierarchy) {
        throw new Error('Cannot assign a role with equal or higher privilege than your own');
    }

    await db
      .update(workspaceMembers)
      .set({ role_id: newRoleId })
      .where(
        and(
          eq(workspaceMembers.workspace_id, workspaceId),
          eq(workspaceMembers.user_id, userIdToUpdate)
        )
      );
      
    return true;
  } catch (error) {
    logger.error('Error updating member role:', error);
    throw error;
  }
};
