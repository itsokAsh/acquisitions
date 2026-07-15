import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import logger from './logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', err => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

const db = drizzle(pool);

export { db, pool };
