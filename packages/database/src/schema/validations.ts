import { pgTable, text, timestamp, integer, boolean, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { validationStatusEnum } from './enums';
import { users } from './users';
import { routes } from './routes';

export const validations = pgTable('validations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  routeId: text('route_id').notNull().references(() => routes.id),
  validatedAt: timestamp('validated_at').notNull().defaultNow(),
  personalNote: text('personal_note'),
  status: validationStatusEnum('status').notNull().default('EN_PROJET'),
  attempts: integer('attempts').notNull().default(1), // Nombre d'essais
  isFlashed: boolean('is_flashed').notNull().default(false), // Validé du premier coup
  isFavorite: boolean('is_favorite').notNull().default(false), // Marqué comme favori
}, (table) => [
  unique('validations_user_route_unique').on(table.userId, table.routeId),
]);

export const validationsRelations = relations(validations, ({ one }) => ({
  user: one(users, {
    fields: [validations.userId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [validations.routeId],
    references: [routes.id],
  }),
}));

export type Validation = typeof validations.$inferSelect;
export type NewValidation = typeof validations.$inferInsert;
