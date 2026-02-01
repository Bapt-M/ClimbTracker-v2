import type { Context, Next } from 'hono';
import { auth, type Session } from '../lib/auth';

// Extend Hono context with session
declare module 'hono' {
  interface ContextVariableMap {
    session: Session | null;
    user: Session['user'] | null;
  }
}

// Middleware to attach session to context (optional auth)
export async function sessionMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  c.set('session', session);
  c.set('user', session?.user ?? null);

  await next();
}

// Middleware to require authentication
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('session', session);
  c.set('user', session.user);

  await next();
}

// Middleware to require specific role(s)
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userRole = (session.user as any).role || 'CLIMBER';

    if (!roles.includes(userRole)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    c.set('session', session);
    c.set('user', session.user);

    await next();
  };
}
