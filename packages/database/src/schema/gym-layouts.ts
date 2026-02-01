import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Sector mapping type
export type SectorMapping = {
  [sectorId: string]: {
    label: string;
    pathId: string;
    coordinates?: { x: number; y: number };
  };
};

export const gymLayouts = pgTable('gym_layouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(), // e.g., 'main_gym', 'training_area'
  svgContent: text('svg_content').notNull(), // Raw SVG markup
  sectorMappings: jsonb('sector_mappings').$type<SectorMapping>(), // Mapping of sectors to SVG elements
  isActive: boolean('is_active').notNull().default(true), // Whether this layout is currently active
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GymLayout = typeof gymLayouts.$inferSelect;
export type NewGymLayout = typeof gymLayouts.$inferInsert;
