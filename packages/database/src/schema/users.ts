import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoleEnum } from './enums';
import { routes } from './routes';
import { validations } from './validations';
import { comments } from './comments';
import { videos } from './videos';
import { friendships } from './friendships';
import { sessions } from './sessions';
import { accounts } from './accounts';

export const users = pgTable('users', {
  // Better Auth required fields
  id: uuid('id').primaryKey().defaultRandom(),
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
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
