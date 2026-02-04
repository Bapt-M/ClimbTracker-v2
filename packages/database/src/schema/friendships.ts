import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { friendshipStatusEnum } from './enums';
import { users } from './users';

export const friendships = pgTable('friendships', {
  id: text('id').primaryKey(),
  requesterId: text('requester_id').notNull().references(() => users.id), // Celui qui envoie la demande
  addresseeId: text('addressee_id').notNull().references(() => users.id), // Celui qui reçoit la demande
  status: friendshipStatusEnum('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
}, (table) => [
  uniqueIndex('friendships_requester_addressee_unique').on(table.requesterId, table.addresseeId),
]);

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'addressee',
  }),
}));

export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
