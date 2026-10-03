import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  bigint,
  jsonb,
  date,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

// 1. Users Table (ADR 0001 & ADR 0002)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayName: varchar('display_name', { length: 32 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  oauthProvider: varchar('oauth_provider', { length: 32 }),
  oauthId: varchar('oauth_id', { length: 255 }).unique(),
  isGuest: boolean('is_guest').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).defaultNow(),
});

// 2. Sessions Table (Hashed Token Storage)
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sessions_token_hash').on(table.tokenHash),
  ]
);

// 3. Characters Table
export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 32 }).notNull(),
  classType: varchar('class_type', { length: 16 }).notNull(),
  level: integer('level').default(1),
  xp: integer('xp').default(0),
  totalRuns: integer('total_runs').default(0),
  victories: integer('victories').default(0),
  inventoryJson: jsonb('inventory_json').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 4. Daily Seeds Table
export const dailySeeds = pgTable('daily_seeds', {
  dateKey: date('date_key').primaryKey(),
  seedNumber: bigint('seed_number', { mode: 'number' }).notNull(),
  modifiersJson: jsonb('modifiers_json').default([]),
  bossName: varchar('boss_name', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. Dungeon Runs (Leaderboard & History)
export const dungeonRuns = pgTable(
  'dungeon_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dateKey: date('date_key')
      .notNull()
      .references(() => dailySeeds.dateKey),
    roomId: varchar('room_id', { length: 32 }).notNull(),
    status: varchar('status', { length: 16 }).notNull(), // 'VICTORY' or 'DEFEAT'
    stageReached: integer('stage_reached').notNull(), // 1 or 2
    roundsTaken: integer('rounds_taken').notNull(),
    durationMs: integer('duration_ms').notNull(),
    partySize: integer('party_size').notNull(),
    partyJson: jsonb('party_json').notNull(),
    combatLogJson: jsonb('combat_log_json').default([]),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_leaderboard').on(
      table.dateKey,
      table.status,
      table.roundsTaken,
      table.durationMs
    ),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type DailySeed = typeof dailySeeds.$inferSelect;
export type NewDailySeed = typeof dailySeeds.$inferInsert;
export type DungeonRun = typeof dungeonRuns.$inferSelect;
export type NewDungeonRun = typeof dungeonRuns.$inferInsert;
