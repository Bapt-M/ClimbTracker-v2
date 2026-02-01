import { pgEnum } from 'drizzle-orm/pg-core';

// User roles
export const userRoleEnum = pgEnum('user_role', ['CLIMBER', 'OPENER', 'ADMIN']);

// Route status
export const routeStatusEnum = pgEnum('route_status', ['PENDING', 'ACTIVE', 'ARCHIVED']);

// Difficulty colors (ordered by difficulty)
export const difficultyColorEnum = pgEnum('difficulty_color', [
  'Vert',
  'Vert clair',
  'Bleu clair',
  'Bleu foncé',
  'Violet',
  'Rose',
  'Rouge',
  'Orange',
  'Jaune',
  'Blanc',
  'Gris',
  'Noir',
]);

// Hold color categories for filtering
export const holdColorCategoryEnum = pgEnum('hold_color_category', [
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'black',
  'white',
  'grey',
]);

// Validation status
export const validationStatusEnum = pgEnum('validation_status', ['EN_PROJET', 'VALIDE']);

// Media type for comments
export const mediaTypeEnum = pgEnum('media_type', ['IMAGE', 'VIDEO']);

// Friendship status
export const friendshipStatusEnum = pgEnum('friendship_status', ['PENDING', 'ACCEPTED', 'REJECTED']);
