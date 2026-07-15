import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { eq, and } from 'drizzle-orm';
import { workspaceMembers } from '#models/workspace-member.model.js';
import { roles } from '#models/role.model.js';

export const requireWorkspaceContext = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.headers['x-workspace-id'];

    if (!workspaceId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Workspace ID is required in URL params or X-Workspace-Id header',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required before workspace context',
      });
    }

    // Lookup the user's membership in this workspace
    const [membership] = await db
      .select({
        id: workspaceMembers.id,
        role_id: workspaceMembers.role_id,
        role_name: roles.name,
        role_hierarchy: roles.hierarchy,
      })
      .from(workspaceMembers)
      .innerJoin(roles, eq(workspaceMembers.role_id, roles.id))
      .where(
        and(
          eq(workspaceMembers.user_id, req.user.id),
          eq(workspaceMembers.workspace_id, workspaceId)
        )
      )
      .limit(1);

    if (!membership) {
      logger.warn(`User ${req.user.id} attempted to access workspace ${workspaceId} without membership`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this workspace',
      });
    }

    // Attach workspace and membership context to the request
    req.workspaceId = workspaceId;
    req.membership = membership;

    next();
  } catch (error) {
    logger.error('Error in workspace context middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify workspace membership',
    });
  }
};
