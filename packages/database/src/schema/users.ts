import { pgTable, varchar, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoleEnum } from './enums';
import { routes } from './routes';
import { validations } from './validations';
import { comments } from './comments';
import { videos } from './videos';
import { friendships } from './friendships';
import { sessions } from './sessions';
import { accounts } from './accounts';
import { pushSubscriptions } from './push-subscriptions';

export const users = pgTable('users', {
  // Better Auth required fields (text ID for Better Auth compatibility)
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: varchar('name', { length: 255 }).notNull(),
  image: varchar('image', { length: 255 }), // Better Auth uses 'image' for avatar

  // ClimbTracker custom fields
  role: userRoleEnum('role').notNull().default('CLIMBER'),
  bio: text('bio'),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  age: integer('age'),
  height: integer('height'), // height in cm
  wingspan: integer('wingspan'), // wingspan in cm (envergure)
  profilePhoto: varchar('profile_photo', { length: 255 }), // Cloudinary URL
  additionalPhotos: jsonb('additional_photos').$type<string[]>(), // Array of Cloudinary URLs

  // Stripe subscription fields
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  stripeCurrentPeriodEnd: timestamp('stripe_current_period_end'),
  isPremium: boolean('is_premium').notNull().default(false),

  // Notification preferences
  emailNotifications: boolean('email_notifications').notNull().default(true),
  pushNotifications: boolean('push_notifications').notNull().default(true),
  notificationPreferences: jsonb('notification_preferences').$type<{
    email: {
      friendRequest: boolean;
      friendAccepted: boolean;
      routeValidated: boolean;
      commentReceived: boolean;
      routeCreated: boolean;
      achievementUnlocked: boolean;
      system: boolean;
    };
    push: {
      friendRequest: boolean;
      friendAccepted: boolean;
      routeValidated: boolean;
      commentReceived: boolean;
      routeCreated: boolean;
      achievementUnlocked: boolean;
      system: boolean;
    };
  }>(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  routes: many(routes),
  validations: many(validations),
  comments: many(comments),
  videos: many(videos),
  sentFriendRequests: many(friendships, { relationName: 'requester' }),
  receivedFriendRequests: many(friendships, { relationName: 'addressee' }),
  sessions: many(sessions),
  accounts: many(accounts),
  pushSubscriptions: many(pushSubscriptions),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
