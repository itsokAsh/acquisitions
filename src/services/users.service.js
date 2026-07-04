import logger from '#config/logger.js';
import { db } from '#config/database.js';
import { users } from '#models/user.model.js';
import { eq } from 'drizzle-orm';
import {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  cacheKeys,
  DEFAULT_TTL,
} from './cache.service.js';

export const getAllUsers = async () => {
  try {
    // Try cache first
    const cached = await getCache(cacheKeys.allUsers());
    if (cached) {
      logger.info('Returning users from cache');
      return cached;
    }

    // Cache miss - fetch from database
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users);

    // Store in cache
    await setCache(cacheKeys.allUsers(), allUsers, DEFAULT_TTL.USER);
    logger.info('Users fetched from database and cached');

    return allUsers;
  } catch (e) {
    logger.error('Error getting users', e);
    throw e;
  }
};

export const getUserById = async id => {
  try {
    // Try cache first
    const cacheKey = cacheKeys.user(id);
    const cached = await getCache(cacheKey);
    if (cached) {
      logger.info(`Returning user ${id} from cache`);
      return cached;
    }

    // Cache miss - fetch from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Store in cache
    await setCache(cacheKey, user, DEFAULT_TTL.USER);
    logger.info(`User ${id} fetched from database and cached`);

    return user;
  } catch (e) {
    logger.error(`Error getting user by id ${id}:`, e);
    throw e;
  }
};

export const updateUser = async (id, updates) => {
  try {
    // First check if user exists
    const existingUser = await getUserById(id);

    // Check if email is being updated and if it already exists
    if (updates.email && updates.email !== existingUser.email) {
      const [emailExists] = await db
        .select()
        .from(users)
        .where(eq(users.email, updates.email))
        .limit(1);
      if (emailExists) {
        throw new Error('Email already exists');
      }
    }

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date(),
    };

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        created_at: users.created_at,
        updated_at: users.updated_at,
      });

    // Invalidate caches
    await deleteCache(cacheKeys.user(id));
    await deleteCache(cacheKeys.allUsers());
    logger.info(`User ${updatedUser.email} updated and cache invalidated`);

    return updatedUser;
  } catch (e) {
    logger.error(`Error updating user ${id}:`, e);
    throw e;
  }
};

export const deleteUser = async id => {
  try {
    // First check if user exists
    await getUserById(id);

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    // Invalidate caches
    await deleteCache(cacheKeys.user(id));
    await deleteCache(cacheKeys.allUsers());
    logger.info(`User ${deletedUser.email} deleted and cache invalidated`);

    return deletedUser;
  } catch (e) {
    logger.error(`Error deleting user ${id}:`, e);
    throw e;
  }
};
