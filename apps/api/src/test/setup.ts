import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret');
vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
vi.stubEnv('FRONTEND_URL', 'http://localhost:5173');
vi.stubEnv('PORT', '3000');
