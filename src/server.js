import app from './app.js';
import { connectRedis } from './config/redis.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3000;

// Initialize Redis connection
await connectRedis();

app.listen(PORT, () => {
  logger.info(`Server is running on port http://localhost:${PORT}`);
  console.log(`Server is running on port http://localhost:${PORT}`);
});
