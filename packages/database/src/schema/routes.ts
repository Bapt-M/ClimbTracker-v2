import { pgTable, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { routeStatusEnum, difficultyColorEnum, holdColorCategoryEnum } from './enums';
import { users } from './users';
import { validations } from './validations';
import { comments } from './comments';
import { analyses } from './analyses';

export const routes = pgTable('routes', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  difficulty: difficultyColorEnum('difficulty').notNull(),
  holdColorHex: varchar('hold_color_hex', { length: 50 }).notNull(), // Hex color of holds, e.g., #FF5733
  holdColorCategory: holdColorCategoryEnum('hold_color_category').notNull(), // Category for filtering
  sector: varchar('sector', { length: 255 }).notNull(),
  routeTypes: jsonb('route_types').$type<string[]>(), // Array of route characteristics (réglette, dévers, etc.)
  description: text('description'),
  tips: text('tips'),
  openerId: text('opener_id').notNull().references(() => users.id),
  mainPhoto: varchar('main_photo', { length: 255 }).notNull(),
  openingVideo: varchar('opening_video', { length: 255 }),
  status: routeStatusEnum('status').notNull().default('PENDING'),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
  holdMapping: jsonb('hold_mapping'), // AI-detected holds data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const routesRelations = relations(routes, ({ one, many }) => ({
  opener: one(users, {
    fields: [routes.openerId],
    references: [users.id],
  }),
  validations: many(validations),
  comments: many(comments),
  analyses: many(analyses),
}));

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
