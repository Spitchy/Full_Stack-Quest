import express from 'express';
import { requireToken } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { classementRouter } from './routes/classement.js';
import { notFound, errorHandler } from './errors.js';

export function createApp({ jwtSecret, rateLimit: rateLimitOptions }) {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api/v1', rateLimit(rateLimitOptions), requireToken(jwtSecret), classementRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
