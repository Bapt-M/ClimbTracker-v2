import { Hono } from 'hono';
import { db } from '../lib/auth';
import { gymLayouts } from '@climbtracker/database/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import { eq, desc } from 'drizzle-orm';

const app = new Hono();

// GET /api/gym-layout/active - Get active gym layout
app.get('/active', requireAuth, async (c) => {
  const activeLayout = await db.query.gymLayouts.findFirst({
    where: eq(gymLayouts.isActive, true),
    orderBy: [desc(gymLayouts.updatedAt)],
  });

  if (!activeLayout) {
    return c.json({ success: false, error: 'No active gym layout found' }, 404);
  }

  return c.json({
    id: activeLayout.id,
    name: activeLayout.name,
    svgContent: activeLayout.svgContent,
    sectorMappings: activeLayout.sectorMappings,
    isActive: activeLayout.isActive,
  });
});

// GET /api/gym-layout - List all gym layouts
app.get('/', requireAuth, async (c) => {
  const layouts = await db.query.gymLayouts.findMany({
    orderBy: [desc(gymLayouts.updatedAt)],
  });

  return c.json({ success: true, data: { layouts } });
});

// GET /api/gym-layout/:id - Get specific gym layout
app.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');

  const layout = await db.query.gymLayouts.findFirst({
    where: eq(gymLayouts.id, id),
  });

  if (!layout) {
    return c.json({ success: false, error: 'Gym layout not found' }, 404);
  }

  return c.json({ success: true, data: { layout } });
});

// POST /api/gym-layout - Create gym layout (ADMIN only)
app.post('/', requireAuth, requireRole('ADMIN'), async (c) => {
  const body = await c.req.json();

  // If this layout is active, deactivate others
  if (body.isActive) {
    await db.update(gymLayouts)
      .set({ isActive: false })
      .where(eq(gymLayouts.isActive, true));
  }

  const [newLayout] = await db.insert(gymLayouts).values({
    id: crypto.randomUUID(),
    name: body.name,
    svgContent: body.svgContent,
    sectorMappings: body.sectorMappings,
    isActive: body.isActive ?? false,
  }).returning();

  return c.json({ success: true, data: { layout: newLayout } }, 201);
});

// PUT /api/gym-layout/:id - Update gym layout (ADMIN only)
app.put('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  // If this layout is being set to active, deactivate others
  if (body.isActive) {
    await db.update(gymLayouts)
      .set({ isActive: false })
      .where(eq(gymLayouts.isActive, true));
  }

  const [updatedLayout] = await db.update(gymLayouts)
    .set({
      name: body.name,
      svgContent: body.svgContent,
      sectorMappings: body.sectorMappings,
      isActive: body.isActive,
      updatedAt: new Date(),
    })
    .where(eq(gymLayouts.id, id))
    .returning();

  if (!updatedLayout) {
    return c.json({ success: false, error: 'Gym layout not found' }, 404);
  }

  return c.json({ success: true, data: { layout: updatedLayout } });
});

// DELETE /api/gym-layout/:id - Delete gym layout (ADMIN only)
app.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
  const id = c.req.param('id');

  const [deletedLayout] = await db.delete(gymLayouts)
    .where(eq(gymLayouts.id, id))
    .returning();

  if (!deletedLayout) {
    return c.json({ success: false, error: 'Gym layout not found' }, 404);
  }

  return c.json({ success: true, message: 'Gym layout deleted' });
});

export default app;
