import 'dotenv/config';
import { db, pool, dailySeeds, users, characters } from './index.js';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  const today = new Date().toISOString().slice(0, 10);

  // 1. Seed today's dungeon seed
  await db
    .insert(dailySeeds)
    .values({
      dateKey: today,
      seedNumber: 20260927,
      modifiersJson: [
        { id: 'iron_resolve', name: 'Iron Resolve', description: 'Monsters deal +20% damage' },
      ],
      bossName: 'Crypt Overseer',
    })
    .onConflictDoNothing();

  // 2. Seed a test hero user
  const seededUsers = await db
    .insert(users)
    .values({
      displayName: 'Dungeon Adventurer',
      email: 'adventurer@daily-dungeon.test',
      oauthProvider: 'test',
      oauthId: 'test-user-001',
    })
    .onConflictDoNothing()
    .returning();

  const user = seededUsers[0] || (await db.select().from(users).limit(1))[0];

  if (user) {
    // 3. Seed sample character
    await db
      .insert(characters)
      .values({
        userId: user.id,
        name: 'Sir Gareth',
        classType: 'warrior',
        level: 1,
        xp: 0,
        totalRuns: 3,
        victories: 2,
        inventoryJson: [
          { id: 'rusty_blade', name: 'Rusty Blade', power: 3 },
          { id: 'wooden_shield', name: 'Wooden Shield', armor: 2 },
        ],
      })
      .onConflictDoNothing();
  }

  console.log('✅ Database seeded successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Database seed failed:', err);
      await pool.end();
      process.exit(1);
    });
}
