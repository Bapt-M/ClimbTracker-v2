import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';

// Better Auth verifications table (email verification, password reset, etc.)
export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(), // Email or other identifier
  value: text('value').notNull(), // Verification token/code
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
