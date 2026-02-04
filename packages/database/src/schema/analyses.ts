import { pgTable, text, doublePrecision, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { videos } from './videos';
import { routes } from './routes';

export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  videoId: text('video_id').notNull().unique().references(() => videos.id),
  routeId: text('route_id').notNull().references(() => routes.id),
  poseData: jsonb('pose_data').notNull(), // MediaPipe pose data
  globalScore: doublePrecision('global_score').notNull(),
  detailScores: jsonb('detail_scores').notNull(), // Detailed scores breakdown
  suggestions: jsonb('suggestions').notNull(), // AI suggestions
  highlights: jsonb('highlights').notNull(), // Key moments timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const analysesRelations = relations(analyses, ({ one }) => ({
  video: one(videos, {
    fields: [analyses.videoId],
    references: [videos.id],
  }),
  route: one(routes, {
    fields: [analyses.routeId],
    references: [routes.id],
  }),
}));

export type Analysis = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;
