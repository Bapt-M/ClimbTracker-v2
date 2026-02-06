import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';

// Create a simple test app with health endpoint
const createTestApp = () => {
  const app = new Hono();
  app.get('/health', (c) => c.json({ status: 'ok', version: '2.0.0' }));
  return app;
};

describe('Health Endpoint', () => {
  it('returns ok status', async () => {
    const app = createTestApp();

    const response = await app.request('/health');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.version).toBe('2.0.0');
  });
});
