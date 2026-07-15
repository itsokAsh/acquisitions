import { config } from 'dotenv';
config({ path: process.env.NODE_ENV === 'development' ? '.env.development' : '.env', override: true });

export default {
  schema: './src/models/*.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
