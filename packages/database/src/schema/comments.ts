import { pgTable, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mediaTypeEnum } from './enums';
import { users } from './users';
import { routes } from './routes';

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  routeId: text('route_id').notNull().references(() => routes.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  mediaUrl: varchar('media_url', { length: 255 }),
  mediaType: mediaTypeEnum('media_type'),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  route: one(routes, {
    fields: [comments.routeId],
    references: [routes.id],
  }),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
