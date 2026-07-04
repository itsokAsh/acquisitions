import { redisClient } from '#config/redis.js';
import logger from '#config/logger.js';

/**
 * Cache Service
 * Provides caching utilities with TTL support
 */

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  USER: 600, // 10 minutes
  JWT: 900, // 15 minutes
  RATE_LIMIT: 60, // 1 minute
};

/**
 * Set a value in cache with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds
 */
export const setCache = async (key, value, ttl = DEFAULT_TTL.USER) => {
  try {
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    await redisClient.setEx(key, ttl, stringValue);
    logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
    return false;
  }
};

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Parsed value or null if not found
 */
export const getCache = async key => {
  try {
    const value = await redisClient.get(key);
    if (!value) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    try {
      return JSON.parse(value);
    } catch {
      return value; // Return as string if not JSON
    }
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

/**
 * Delete a value from cache
 * @param {string} key - Cache key
 */
export const deleteCache = async key => {
  try {
    await redisClient.del(key);
    logger.debug(`Cache deleted: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., 'user:*')
 */
export const deleteCachePattern = async pattern => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
    }
    return true;
  } catch (error) {
    logger.error(`Cache pattern delete error for ${pattern}:`, error);
    return false;
  }
};

/**
 * Check if a key exists in cache
 * @param {string} key - Cache key
 */
export const existsCache = async key => {
  try {
    const exists = await redisClient.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error(`Cache exists error for key ${key}:`, error);
    return false;
  }
};

/**
 * Increment a counter in cache
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds (only for first set)
 */
export const incrementCache = async (key, ttl = DEFAULT_TTL.RATE_LIMIT) => {
  try {
    const value = await redisClient.incr(key);
    // Set expiry only on first increment
    if (value === 1) {
      await redisClient.expire(key, ttl);
    }
    return value;
  } catch (error) {
    logger.error(`Cache increment error for key ${key}:`, error);
    return null;
  }
};

/**
 * Get cache stats
 */
export const getCacheStats = async () => {
  try {
    const info = await redisClient.info('stats');
    const keyspace = await redisClient.info('keyspace');
    return {
      info,
      keyspace,
      connected: redisClient.isOpen,
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return null;
  }
};

// Cache key generators
export const cacheKeys = {
  user: id => `user:${id}`,
  userByEmail: email => `user:email:${email}`,
  allUsers: () => 'users:all',
  jwtVerify: token => `jwt:verify:${token.substring(0, 20)}`,
  rateLimit: (ip, userId) => `ratelimit:${ip}:${userId || 'guest'}`,
};

export { DEFAULT_TTL };
