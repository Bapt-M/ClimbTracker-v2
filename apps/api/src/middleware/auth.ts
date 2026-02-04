import { Context, Next } from 'hono';
import { auth } from '../lib/auth';

// Extend Hono context with user
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'CLIMBER' | 'OPENER' | 'ADMIN';
      image?: string | null;
    };
    session: {
      id: string;
      token: string;
      expiresAt: Date;
    };
  }
}

export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user as ContextVariableMap['user']);
  c.set('session', session.session as ContextVariableMap['session']);

  await next();
}

export function requireRole(...roles: ('CLIMBER' | 'OPENER' | 'ADMIN')[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden - Insufficient permissions' }, 403);
    }

    await next();
  };
}
