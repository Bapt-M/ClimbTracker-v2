import { Hono } from 'hono';

/**
 * Helper to make test requests to a Hono app
 */
export async function testRequest(
  app: Hono,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
) {
  const { body, headers = {} } = options;

  const request = new Request(`http://localhost${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const response = await app.fetch(request);
  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'USER',
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock route for testing
 */
export function createMockRoute(overrides = {}) {
  return {
    id: 'test-route-id',
    name: 'Test Route',
    difficulty: 'Bleu',
    holdColorHex: '#0000FF',
    holdColorCategory: 'Bleu',
    sector: 'A1',
    routeTypes: ['dalle'],
    description: 'A test route',
    tips: null,
    openerId: 'test-opener-id',
    mainPhoto: null,
    openingVideo: null,
    status: 'ACTIVE',
    openedAt: new Date(),
    closedAt: null,
    holdMapping: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock validation for testing
 */
export function createMockValidation(overrides = {}) {
  return {
    id: 'test-validation-id',
    routeId: 'test-route-id',
    userId: 'test-user-id',
    status: 'VALIDE',
    attempts: 1,
    isFlashed: true,
    isFavorite: false,
    personalNote: null,
    validatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
