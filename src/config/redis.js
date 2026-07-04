import { createClient } from 'redis';
import logger from './logger.js';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    reconnectStrategy: retries => {
      if (retries > 10) {
        logger.error('Redis reconnection attempts exhausted');
        return new Error('Redis reconnection failed');
      }
      const delay = Math.min(retries * 50, 2000);
      logger.info(`Reconnecting to Redis in ${delay}ms`);
      return delay;
    },
  },
});

redisClient.on('error', err => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info('✅ Redis connected successfully');
    }
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.quit();
  logger.info('Redis connection closed');
  process.exit(0);
});

export { redisClient, connectRedis };
