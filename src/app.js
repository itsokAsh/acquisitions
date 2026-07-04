import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.routes.js';
import usersRoutes from '#routes/users.routes.js';
import { securityMiddleware } from '#middleware/security.middleware.js';
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);

app.use(securityMiddleware);

app.get('/', (req, res) => {
  logger.info('hello from Acquisitions!');
  res.status(200).send('Welcome to the Acquisitions API');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/cache', async (req, res) => {
  try {
    const { getCacheStats } = await import('#services/cache.service.js');
    const stats = await getCacheStats();
    res.status(200).json({
      status: 'OK',
      cache: stats,
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Cache health check failed',
    });
  }
});

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Acquisitions API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;
