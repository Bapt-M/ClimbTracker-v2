import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { analyses } from './analyses';

export const videos = pgTable('videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  url: varchar('url', { length: 255 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 255 }).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id),
  routeId: uuid('route_id').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});

export const videosRelations = relations(videos, ({ one }) => ({
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  analysis: one(analyses),
}));

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
