import { pgTable, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Notification types
export const notificationTypeEnum = pgEnum('notification_type', [
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'ROUTE_VALIDATED',
  'COMMENT_RECEIVED',
  'ROUTE_CREATED',
  'ACHIEVEMENT_UNLOCKED',
  'SYSTEM',
]);

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),

  // Recipient
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Notification content
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),

  // Optional link to related content
  link: text('link'),

  // Related entities (optional)
  relatedUserId: text('related_user_id').references(() => users.id, { onDelete: 'set null' }),
  relatedRouteId: text('related_route_id'),

  // Status
  read: boolean('read').notNull().default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  relatedUser: one(users, {
    fields: [notifications.relatedUserId],
    references: [users.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
