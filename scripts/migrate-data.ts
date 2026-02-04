/**
 * Data Migration Script: ClimbTracker Hueco (v1) -> v2 (Drizzle/Better Auth)
 *
 * Prerequisites:
 * 1. Both databases must be accessible
 * 2. v2 database schema must be pushed (pnpm db:push)
 * 3. Set environment variables:
 *    - V1_DATABASE_URL: PostgreSQL connection string for v1 (Hueco)
 *    - DATABASE_URL: PostgreSQL connection string for v2 (Supabase)
 *
 * Usage: pnpm tsx scripts/migrate-data.ts
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'crypto';
import * as schema from '../packages/database/src/schema';

// Environment variables - strip any surrounding quotes
function cleanUrl(url: string): string {
  return url.replace(/^["']|["']$/g, '').trim();
}

const V1_DATABASE_URL = cleanUrl(process.env.V1_DATABASE_URL || 'postgresql://climbtracker:climbtrack123@localhost:5433/climbtracker');
const V2_DATABASE_URL = cleanUrl(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/climbtracker_v2');

// ID mapping to track old -> new IDs
const userIdMap = new Map<string, string>();
const routeIdMap = new Map<string, string>();

async function migrateUsers(v1: postgres.Sql, v2: ReturnType<typeof drizzle>) {
  console.log('\n👤 Migrating users...');

  const v1Users = await v1`SELECT * FROM users ORDER BY "createdAt" ASC`;
  console.log(`Found ${v1Users.length} users to migrate`);

  for (const u of v1Users) {
    const newId = randomUUID();
    userIdMap.set(u.id, newId);

    try {
      await v2.insert(schema.users).values({
        id: newId,
        email: u.email,
        emailVerified: false,
        name: u.name,
        image: u.profilePhoto || u.avatar || null,
        role: u.role || 'CLIMBER',
        bio: u.bio || null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      }).onConflictDoNothing();

      // Create account for email/password login (Better Auth)
      await v2.insert(schema.accounts).values({
        id: randomUUID(),
        userId: newId,
        accountId: newId,
        providerId: 'credential',
        password: u.password, // Keep hashed password
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      }).onConflictDoNothing();

      console.log(`  ✓ Migrated user: ${u.email}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate user ${u.email}:`, error);
    }
  }

  console.log(`✓ Migrated ${userIdMap.size} users`);
}

async function migrateRoutes(v1: postgres.Sql, v2: ReturnType<typeof drizzle>) {
  console.log('\n🧗 Migrating routes...');

  const v1Routes = await v1`SELECT * FROM routes ORDER BY "createdAt" ASC`;
  console.log(`Found ${v1Routes.length} routes to migrate`);

  for (const r of v1Routes) {
    const newId = randomUUID();
    routeIdMap.set(r.id, newId);

    const openerNewId = userIdMap.get(r.openerId);
    if (!openerNewId) {
      console.error(`  ✗ Opener not found for route ${r.name}, skipping...`);
      continue;
    }

    try {
      await v2.insert(schema.routes).values({
        id: newId,
        name: r.name,
        difficulty: r.difficulty as any,
        holdColorHex: r.holdColorHex,
        holdColorCategory: r.holdColorCategory as any,
        sector: r.sector || 'A',
        description: r.description || null,
        tips: r.tips || null,
        openerId: openerNewId,
        mainPhoto: r.mainPhoto,
        openingVideo: r.openingVideo || null,
        status: r.status || 'ACTIVE',
        openedAt: new Date(r.openedAt),
        closedAt: r.closedAt ? new Date(r.closedAt) : null,
        holdMapping: r.holdMapping || null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }).onConflictDoNothing();

      console.log(`  ✓ Migrated route: ${r.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate route ${r.name}:`, error);
    }
  }

  console.log(`✓ Migrated ${routeIdMap.size} routes`);
}

async function migrateValidations(v1: postgres.Sql, v2: ReturnType<typeof drizzle>) {
  console.log('\n✅ Migrating validations...');

  const v1Validations = await v1`SELECT * FROM validations ORDER BY "validatedAt" ASC`;
  console.log(`Found ${v1Validations.length} validations to migrate`);

  let migrated = 0;
  for (const val of v1Validations) {
    const userNewId = userIdMap.get(val.userId);
    const routeNewId = routeIdMap.get(val.routeId);

    if (!userNewId || !routeNewId) {
      console.error(`  ✗ Missing mapping for validation, user: ${val.userId}, route: ${val.routeId}`);
      continue;
    }

    try {
      await v2.insert(schema.validations).values({
        id: randomUUID(),
        userId: userNewId,
        routeId: routeNewId,
        validatedAt: new Date(val.validatedAt),
        personalNote: val.personalNote || null,
        status: val.status || 'VALIDE',
        attempts: val.attempts || 1,
        isFlashed: val.isFlashed || false,
        isFavorite: val.isFavorite || false,
      }).onConflictDoNothing();

      migrated++;
    } catch (error) {
      console.error(`  ✗ Failed to migrate validation:`, error);
    }
  }

  console.log(`✓ Migrated ${migrated} validations`);
}

async function migrateComments(v1: postgres.Sql, v2: ReturnType<typeof drizzle>) {
  console.log('\n💬 Migrating comments...');

  const v1Comments = await v1`SELECT * FROM comments ORDER BY "createdAt" ASC`;
  console.log(`Found ${v1Comments.length} comments to migrate`);

  let migrated = 0;
  for (const c of v1Comments) {
    const userNewId = userIdMap.get(c.userId);
    const routeNewId = routeIdMap.get(c.routeId);

    if (!userNewId || !routeNewId) {
      console.error(`  ✗ Missing mapping for comment, user: ${c.userId}, route: ${c.routeId}`);
      continue;
    }

    try {
      await v2.insert(schema.comments).values({
        id: randomUUID(),
        content: c.content,
        userId: userNewId,
        routeId: routeNewId,
        mediaUrl: c.mediaUrl || null,
        mediaType: c.mediaType as any || null,
        createdAt: new Date(c.createdAt),
      }).onConflictDoNothing();

      migrated++;
    } catch (error) {
      console.error(`  ✗ Failed to migrate comment:`, error);
    }
  }

  console.log(`✓ Migrated ${migrated} comments`);
}

async function migrateFriendships(v1: postgres.Sql, v2: ReturnType<typeof drizzle>) {
  console.log('\n🤝 Migrating friendships...');

  const v1Friendships = await v1`SELECT * FROM friendships ORDER BY "createdAt" ASC`;
  console.log(`Found ${v1Friendships.length} friendships to migrate`);

  let migrated = 0;
  for (const f of v1Friendships) {
    const requesterNewId = userIdMap.get(f.requesterId);
    const addresseeNewId = userIdMap.get(f.addresseeId);

    if (!requesterNewId || !addresseeNewId) {
      console.error(`  ✗ Missing mapping for friendship, requester: ${f.requesterId}, addressee: ${f.addresseeId}`);
      continue;
    }

    try {
      await v2.insert(schema.friendships).values({
        id: randomUUID(),
        requesterId: requesterNewId,
        addresseeId: addresseeNewId,
        status: f.status || 'PENDING',
        createdAt: new Date(f.createdAt),
        acceptedAt: f.acceptedAt ? new Date(f.acceptedAt) : null,
      }).onConflictDoNothing();

      migrated++;
    } catch (error) {
      console.error(`  ✗ Failed to migrate friendship:`, error);
    }
  }

  console.log(`✓ Migrated ${migrated} friendships`);
}

async function verifyMigration(v1: postgres.Sql, v2: ReturnType<typeof drizzle>) {
  console.log('\n🔍 Verifying migration...');

  const [v1UserCount] = await v1`SELECT COUNT(*) as count FROM users`;
  const [v1RouteCount] = await v1`SELECT COUNT(*) as count FROM routes`;
  const [v1ValidationCount] = await v1`SELECT COUNT(*) as count FROM validations`;
  const [v1CommentCount] = await v1`SELECT COUNT(*) as count FROM comments`;
  const [v1FriendshipCount] = await v1`SELECT COUNT(*) as count FROM friendships`;

  const v2Users = await v2.select().from(schema.users);
  const v2Routes = await v2.select().from(schema.routes);
  const v2Validations = await v2.select().from(schema.validations);
  const v2Comments = await v2.select().from(schema.comments);
  const v2Friendships = await v2.select().from(schema.friendships);

  console.log('\n📊 Migration Summary:');
  console.log('==================================================');
  console.log(`  Users:       ${v1UserCount.count} -> ${v2Users.length}`);
  console.log(`  Routes:      ${v1RouteCount.count} -> ${v2Routes.length}`);
  console.log(`  Validations: ${v1ValidationCount.count} -> ${v2Validations.length}`);
  console.log(`  Comments:    ${v1CommentCount.count} -> ${v2Comments.length}`);
  console.log(`  Friendships: ${v1FriendshipCount.count} -> ${v2Friendships.length}`);
  console.log('==================================================');

  const allMigrated =
    Number(v1UserCount.count) === v2Users.length &&
    Number(v1RouteCount.count) === v2Routes.length &&
    Number(v1ValidationCount.count) === v2Validations.length &&
    Number(v1CommentCount.count) === v2Comments.length &&
    Number(v1FriendshipCount.count) === v2Friendships.length;

  if (allMigrated) {
    console.log('\n🎉 All data migrated successfully!');
  } else {
    console.log('\n⚠️  Some data may not have been migrated. Check the logs above.');
  }
}

async function main() {
  console.log('🚀 Starting ClimbTracker Hueco -> v2 Data Migration\n');
  console.log('Source DB (Hueco):', V1_DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
  console.log('Target DB (v2):   ', V2_DATABASE_URL.replace(/:[^:@]+@/, ':***@'));

  const v1 = postgres(V1_DATABASE_URL);
  const v2Client = postgres(V2_DATABASE_URL);
  const v2 = drizzle(v2Client, { schema });

  try {
    await migrateUsers(v1, v2);
    await migrateRoutes(v1, v2);
    await migrateValidations(v1, v2);
    await migrateComments(v1, v2);
    await migrateFriendships(v1, v2);
    await verifyMigration(v1, v2);
    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await v1.end();
    await v2Client.end();
  }
}

main();
