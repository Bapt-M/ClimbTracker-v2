// Load env first - MUST be the first import
import { env } from './env';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';
import { readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '../../../uploads');

// Import routes
import routesRoutes from './routes/routes';
import validationsRoutes from './routes/validations';
import usersRoutes from './routes/users';
import commentsRoutes from './routes/comments';
import friendshipsRoutes from './routes/friendships';
import leaderboardRoutes from './routes/leaderboard';
import webhooksRoutes from './routes/webhooks';
import gymLayoutRoutes from './routes/gym-layout';
import imageRoutes from './routes/image';
import uploadRoutes from './routes/upload';
import analyticsRoutes from './routes/analytics';
import stripeRoutes from './routes/stripe';
import notificationsRoutes from './routes/notifications';

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

// Serve uploaded files statically (for local development)
app.get('/uploads/*', async (c) => {
  const filePath = c.req.path.replace('/uploads/', '');
  const fullPath = join(UPLOADS_DIR, filePath);

  // Security: ensure path is within uploads dir
  if (!fullPath.startsWith(UPLOADS_DIR)) {
    return c.json({ error: 'Invalid path' }, 403);
  }

  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) {
      return c.json({ error: 'Not found' }, 404);
    }

    const content = await readFile(fullPath);

    // Determine content type
    const ext = fullPath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return c.json({ error: 'Not found' }, 404);
  }
});

// API routes
app.get('/api', (c) => c.json({ message: 'ClimbTracker API v2' }));
app.route('/api/routes', routesRoutes);
app.route('/api/validations', validationsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/comments', commentsRoutes);
app.route('/api/friendships', friendshipsRoutes);
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/webhooks', webhooksRoutes);
app.route('/api/gym-layout', gymLayoutRoutes);
app.route('/api/image', imageRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/stripe', stripeRoutes);
app.route('/api/notifications', notificationsRoutes);

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
