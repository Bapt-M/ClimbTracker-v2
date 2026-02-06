import { describe, it, expect } from 'vitest';
import { createMockUser, createMockRoute, createMockValidation } from './helpers';

describe('Test Helpers', () => {
  describe('createMockUser', () => {
    it('creates a user with default values', () => {
      const user = createMockUser();

      expect(user.id).toBe('test-user-id');
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('USER');
    });

    it('allows overriding default values', () => {
      const user = createMockUser({
        id: 'custom-id',
        role: 'ADMIN',
      });

      expect(user.id).toBe('custom-id');
      expect(user.role).toBe('ADMIN');
      expect(user.name).toBe('Test User'); // default preserved
    });
  });

  describe('createMockRoute', () => {
    it('creates a route with default values', () => {
      const route = createMockRoute();

      expect(route.id).toBe('test-route-id');
      expect(route.name).toBe('Test Route');
      expect(route.difficulty).toBe('Bleu');
      expect(route.status).toBe('ACTIVE');
    });

    it('allows overriding default values', () => {
      const route = createMockRoute({
        difficulty: 'Rouge',
        status: 'ARCHIVED',
      });

      expect(route.difficulty).toBe('Rouge');
      expect(route.status).toBe('ARCHIVED');
    });
  });

  describe('createMockValidation', () => {
    it('creates a validation with default values', () => {
      const validation = createMockValidation();

      expect(validation.id).toBe('test-validation-id');
      expect(validation.status).toBe('VALIDE');
      expect(validation.isFlashed).toBe(true);
      expect(validation.attempts).toBe(1);
    });

    it('allows overriding default values', () => {
      const validation = createMockValidation({
        status: 'EN_PROJET',
        attempts: 5,
        isFlashed: false,
      });

      expect(validation.status).toBe('EN_PROJET');
      expect(validation.attempts).toBe(5);
      expect(validation.isFlashed).toBe(false);
    });
  });
});
