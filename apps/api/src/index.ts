// Load env first - MUST be the first import
import { env } from './env';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';

// Import routes
import routesRoutes from './routes/routes';
import validationsRoutes from './routes/validations';
import usersRoutes from './routes/users';
import commentsRoutes from './routes/comments';
import friendshipsRoutes from './routes/friendships';
import leaderboardRoutes from './routes/leaderboard';
import webhooksRoutes from './routes/webhooks';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Better Auth handler - handles all /api/auth/* routes
app.all('/api/auth/*', (c) => {
  return auth.handler(c.req.raw);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '2.0.0' }));

// API routes
app.get('/api', (c) => c.json({ message: 'ClimbTracker API v2' }));
app.route('/api/routes', routesRoutes);
app.route('/api/validations', validationsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/comments', commentsRoutes);
app.route('/api/friendships', friendshipsRoutes);
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/webhooks', webhooksRoutes);

// Start server
const port = env.PORT;

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
console.log(`Auth endpoints available at http://localhost:${port}/api/auth/*`);

export default app;
