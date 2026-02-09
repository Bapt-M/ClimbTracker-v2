import { pgTable, text, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { platformEnum } from './enums';
import { users } from './users';

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),

  // User reference
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Web Push fields (VAPID)
  endpoint: text('endpoint'),
  p256dh: text('p256dh'),
  auth: text('auth'),

  // FCM field (native apps)
  fcmToken: text('fcm_token'),

  // Device metadata
  platform: platformEnum('platform').notNull(),
  deviceName: varchar('device_name', { length: 255 }),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
