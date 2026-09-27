# ADR 0002: PostgreSQL on AWS Aurora Serverless v2 for Game Persistence

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Engineering & Product

---

## Context & Problem Statement
*Daily Dungeon* requires persistent storage for:
1. **User Accounts & Authentication Sessions:** Foreign-key relations with automated cascading deletes on token expiration/revocation.
2. **Character Sheets & Equipment:** Structured character progression with semi-structured JSON inventories and traits.
3. **Daily Dungeon Runs & History:** Per-run summaries, party compositions, round counts, and combat event archives.
4. **Daily Seed Leaderboards & Analytics:** Ranked leaderboards sorted by rounds taken, victory status, and clear times across players who played the exact same daily dungeon seed.

We evaluated two architectural storage approaches:
- **Option 1: AWS DynamoDB (NoSQL / Single-Table Design)**
- **Option 2: PostgreSQL on AWS Aurora Serverless v2 (Relational + JSONB)**

---

## Decision Outcome
We decided to adopt **PostgreSQL on AWS Aurora Serverless v2** using **Drizzle ORM**.

### 1. Rationale & Trade-off Analysis

| Requirement | Why PostgreSQL (Aurora Serverless v2) Won | Why DynamoDB Was Rejected |
| :--- | :--- | :--- |
| **Daily Seed Leaderboards** | Trivial `ORDER BY rounds ASC, clear_time_ms ASC` queries per daily seed with standard B-tree indexing. | Requires complex Global Secondary Index (GSI) overloading or streaming data to external search engines to sort across players. |
| **Inventory & Gear Slots** | Native `JSONB` columns allow schema-free item objects, affix rolls, and equipment slots without rigid tabular migrations. | Supported, but subject to 400 KB item limits and awkward document path expressions. |
| **Local Developer Experience** | Developers can run local PostgreSQL via Docker or SQLite during local development with zero AWS credentials required. | Requires DynamoDB Local or LocalStack, which adds overhead and clunky credential management. |
| **Operational Scaling** | Aurora Serverless v2 scales capacity up and down instantly in fine-grained increments (ACUs) and pauses/scales down during idle periods. | DynamoDB on-demand is good, but single-table modeling requires predicting all query access patterns upfront. |
| **Type-Safety & ORM** | Drizzle ORM provides zero-overhead, 100% type-safe SQL query generation directly matching TypeScript types in `@daily-dungeon/shared`. | DynamoDB DocumentClient requires manual marshalling and verbose expression attribute mappings. |

---

### 2. Core Relational Schema

```sql
-- 1. Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    VARCHAR(32) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    oauth_provider  VARCHAR(32),
    oauth_id        VARCHAR(255) UNIQUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sessions
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- 3. Characters
CREATE TABLE characters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(32) NOT NULL,
    class_type      VARCHAR(16) NOT NULL, -- 'warrior', 'rogue', 'priest'
    level           INTEGER DEFAULT 1,
    xp              INTEGER DEFAULT 0,
    inventory_json  JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Daily Seeds & Dungeon Configurations
CREATE TABLE daily_seeds (
    date_key        DATE PRIMARY KEY, -- '2026-09-27'
    seed_number     BIGINT NOT NULL,
    modifiers_json  JSONB DEFAULT '[]'::jsonb,
    boss_name       VARCHAR(64) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Dungeon Run Records (Leaderboard Data)
CREATE TABLE dungeon_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_key        DATE NOT NULL REFERENCES daily_seeds(date_key),
    room_id         VARCHAR(32) NOT NULL,
    status          VARCHAR(16) NOT NULL, -- 'VICTORY' or 'DEFEAT'
    stage_reached   INTEGER NOT NULL,     -- 1 or 2
    rounds_taken    INTEGER NOT NULL,
    duration_ms     INTEGER NOT NULL,
    party_size      INTEGER NOT NULL,
    party_json      JSONB NOT NULL,       -- Snapshot of players and classes
    combat_log_json JSONB DEFAULT '[]'::jsonb,
    completed_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Fast leaderboard index: rank daily runs by victory, lowest rounds, fastest duration
CREATE INDEX idx_leaderboard ON dungeon_runs (date_key, status, rounds_taken ASC, duration_ms ASC);
```

---

## Consequences
- **Positive:** Instant support for daily leaderboards and win-rate statistics with standard SQL.
- **Positive:** Flexible semi-structured `JSONB` for inventory and party snapshots without losing relational integrity.
- **Positive:** Frictionless local developer setup with Drizzle ORM.
- **Trade-off:** Requires VPC peering / PrivateLink configuration if deployed within private AWS subnets alongside server instances.
