# Local Stack & Autonomous Verification Plan

- **Intent:** Enable autonomous agents and developers to run, test, and verify the entire Daily Dungeon stack locally before pushing to GitHub or deploying to AWS.
- **Framework Alignment:** AI-DLC Construction & Verification Gates.
- **Status:** Complete (Verified via `npm run verify:local`)

---

## 1. What We Need to Run the Full Stack Locally

To achieve 100% local parity with our cloud deployment (ECS Fargate + Aurora Serverless v2 Postgres + Express/Vite), we need four local pillars:

### Pillar 1: Local PostgreSQL (Docker Compose)
- **Container:** `postgres:16-alpine` running on `localhost:5432`.
- **Database:** `daily_dungeon_dev` / `daily_dungeon_test`.
- **Persistence:** Local Docker volume (`pgdata`) so game data persists across container restarts.
- **Configuration:** `.env.example` and root `.env` supplying `DATABASE_URL`.

### Pillar 2: Database Migration & Schema Tooling (Drizzle ORM)
- **Schema Definitions:** TypeScript schema file in `packages/server/src/db/schema.ts` defining `users`, `sessions`, `characters`, `daily_seeds`, and `dungeon_runs`.
- **Scripts:**
  - `npm run db:generate` — Generates SQL migration files from TypeScript schema.
  - `npm run db:migrate` — Applies migrations to local Postgres.
  - `npm run db:seed` — Populates sample daily dungeon seeds and test characters.

### Pillar 3: Containerized Monorepo Production Verification
- **Root Dockerfile:** Multi-stage build compiling `@daily-dungeon/shared`, `@daily-dungeon/server`, and `@daily-dungeon/client` into a single production image.
- **Verification Command:**
  - `docker compose up --build` — Boots both the production container (port 3001) and Postgres (port 5432).
  - Validates that Express serves the built Vite client assets, handles WebSockets, and connects to Postgres identically to AWS ECS Fargate.

### Pillar 4: CDK Infrastructure Synthesis Gate
- **Tooling:** AWS CDK CLI (`v2.1143.0`).
- **Verification Command:** `npm run cdk:synth` in `infra/` to confirm that all CloudFormation constructs synthesize with zero errors or warnings before git push.

---

## 2. One-Command Autonomous Verification Suite (`npm run verify:local`)

Under AI-DLC, an agent must be able to run a single command that runs the entire verification pipeline:

```bash
npm run verify:local
```

### Verification Pipeline Sequence:
1. **Unit Tests:** `npm test --workspace=@daily-dungeon/shared` (pure combat engine math & turn logic).
2. **Typecheck & Monorepo Build:** `npm run build` across all workspaces (`shared`, `server`, `client`).
3. **Database Health & Migration:** Verify local Postgres connection and apply pending Drizzle migrations.
4. **Infra Synthesis:** `cdk synth` in `infra/` to ensure AWS ECS & Aurora CDK templates compile.
5. **Docker Build Check:** Dry-run or build the root `Dockerfile` to guarantee container image builds cleanly.

---

## 3. Implementation Steps (Checklist)

- [x] **Step 1: Create `docker-compose.yml`**
  - Define local `postgres` service with healthcheck.
  - Define optional `app` service for full container testing.
- [x] **Step 2: Add `.env.example` & Root Environment Config**
  - Provide defaults for `DATABASE_URL`, `PORT=3001`, `NODE_ENV=development`.
- [x] **Step 3: Setup Drizzle ORM in `packages/server`**
  - Install `drizzle-orm`, `pg`, `drizzle-kit`.
  - Create `packages/server/src/db/schema.ts` matching ADR 0001 & ADR 0002.
  - Add migration script and verify connection against local Postgres container.
- [x] **Step 4: Create Root `Dockerfile` & `.dockerignore`**
  - Multi-stage build for monorepo.
- [x] **Step 5: Add Root Verification Script (`npm run verify:local`)**
  - Wire tests, build, db check, and cdk synth into one self-verification loop.
- [x] **Step 6: Update AI-DLC Memory & `AGENTS.md`**
  - Document the local verification commands in project invariants.

