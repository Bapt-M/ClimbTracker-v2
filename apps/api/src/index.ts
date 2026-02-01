import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './lib/auth';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Better Auth handler - handles all /api/auth/* routes
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw);
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '2.0.0' }));

// API routes placeholder
app.get('/api', (c) => c.json({ message: 'ClimbTracker API v2' }));

// Protected route example (will be expanded later)
app.get('/api/me', async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({ user: session.user });
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
console.log(`Auth endpoints available at http://localhost:${port}/api/auth/*`);

export default app;
