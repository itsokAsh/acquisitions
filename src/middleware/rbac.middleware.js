import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { eq } from 'drizzle-orm';
import { rolePermissions } from '#models/role-permission.model.js';
import { permissions } from '#models/permission.model.js';
import { redisClient } from '#config/redis.js';

export const requirePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.membership || !req.membership.role_id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Workspace context is missing or invalid',
        });
      }

      const roleId = req.membership.role_id;
      const cacheKey = `rbac:${roleId}`;
      let rolePerms = [];

      // 1. Try to get permissions from Redis cache
      const cachedPerms = await redisClient.get(cacheKey);
      
      if (cachedPerms) {
        rolePerms = JSON.parse(cachedPerms);
      } else {
        // 2. Cache miss: Fetch from Database
        const result = await db
          .select({
            action: permissions.action,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
          .where(eq(rolePermissions.role_id, roleId));

        rolePerms = result.map((p) => p.action);

        // 3. Save to Redis cache for 5 minutes (300 seconds)
        await redisClient.setEx(cacheKey, 300, JSON.stringify(rolePerms));
      }

      // 4. Check if the required permission is in the list
      if (!rolePerms.includes(requiredPermission)) {
        logger.warn(
          `User ${req.user.id} denied action '${requiredPermission}' in workspace ${req.workspaceId}. Role: ${req.membership.role_name}`
        );
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to perform this action',
        });
      }

      // 5. Allowed
      next();
    } catch (error) {
      logger.error('Error in RBAC middleware:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify permissions',
      });
    }
  };
};
