# Project-Level Rules (Daily Dungeon)

> Project-specific specialisation and corrections for Daily Dungeon.
> Loaded after `org.md` and `team.md` as strict-additive guidance.

## Way of Working
- All feature work follows the 3-phase AI-DLC lifecycle: Inception (story & spec approval) -> Construction (test-driven implementation) -> Operations/Audit.
- Mobile-first portrait priority: every combat screen MUST fit completely within `100dvh` without vertical page scrolling.

## Walking Skeleton & Architecture
- **Server Authority Invariant:** The Node.js + Express + Socket.io server (`packages/server`) owns 100% of game state transitions, combat calculations, round resolution, and RNG seeds.
- **Package Separation:**
  - `packages/shared`: Pure TypeScript logic and types. Zero DOM dependencies, zero Node-specific runtime APIs.
  - `packages/client`: React + Tailwind CSS client. Never imports from `packages/server`.
  - `packages/server`: Authoritative game state machine. Never imports from `packages/client`.

## Testing Posture
- Test-driven construction: before adding or modifying any combat mechanic, write unit tests in `packages/shared/src/combat-engine.test.ts`.
- Mandatory verification commands before declaring any story complete:
  - `npm test --workspace=@daily-dungeon/shared` (all unit tests must pass)
  - `npm run build` (zero TypeScript or bundler errors across all workspaces)

## Guard Policy
- Strict on network payload backward compatibility: any changes to `ResolutionBatch`, `RoomState`, or `PlayerAction` schemas must update both server and client together.
- Strict on mobile viewport budget: do not add blocking modal dialogs during combat turns.

## Tech Stack
- Runtime: Node.js v24+
- Monorepo: npm workspaces (`@daily-dungeon/shared`, `@daily-dungeon/server`, `@daily-dungeon/client`)
- Backend: Express, Socket.io, tsx
- Frontend: React 19, Vite, Tailwind CSS, Lucide icons
- Compute & Hosting: AWS App Runner (Unified container serving Express, Socket.io WebSockets, and built Vite static files)
- Database & ORM: PostgreSQL on AWS Aurora Serverless v2 with Drizzle ORM
- Testing: Vitest

## Decided
- DECIDED: Combat turns are untimed and resolve synchronously when all living players lock in actions.
- DECIDED: Crypt Overseer boss encounter is tuned with 65 HP, reduced damage, and party full-heal between stages.
- DECIDED: Action selection is direct on-screen (3 buttons with move explanation info box above) without pop-up modals.
- DECIDED: Victory / Defeat modals are manually triggered by players ("Collect Loot" / "View Summary").
- DECIDED: Authentication architecture uses self-hosted native sessions (users, sessions tables with SHA-256 hashed tokens in HttpOnly cookies), avoiding 3rd-party SaaS (Clerk/Auth0). Players start with anonymous guest device tokens with optional direct Google/Discord OAuth linking. (2026-09-27)
- DECIDED: Primary database storage engine is PostgreSQL on AWS Aurora Serverless v2 accessed via Drizzle ORM. Relational indexing is utilized for user/session relations and daily seed leaderboards; JSONB columns are used for flexible character inventories and combat run logs. (2026-09-27)
- DECIDED: Cloud deployment architecture utilizes a unified single container hosted on AWS App Runner. Express serves built client static assets (`packages/client/dist`) while hosting Socket.io WebSockets and REST endpoints on a single origin, eliminating CORS issues and simplifying VPC connectivity to Aurora Serverless v2. (2026-09-27)

## Forbidden
- NEVER perform combat damage or state resolution calculations on the client.
- NEVER add full-page scroll containers to the combat view on mobile.
- NEVER conclude a task without executing `npm test` and `npm run build`.

## Mandated
- ALWAYS keep `packages/shared` completely pure and testable with Vitest.
- ALWAYS test network binding on `0.0.0.0` (accessible over local Wi-Fi / LAN).
- ALWAYS check server port `3001` and client port `5173` process hygiene when restarting servers.

## Environment & Integrations (Pre-Verified Facts)
- **Git & GitHub:** Git is initialized with default branch `main`. Remote `origin` is `git@github.com:charltona/daily-dungeon.git`. SSH authentication is pre-verified for GitHub user `charltona`. Do not waste turns probing SSH or re-checking git installation.
- **Trello Board & Workflow ARIs:**
  - Board: `Daily Dungeon` (`ari:cloud:trello::board/workspace/60c9a8ac9046af89b9dd8514/6ab88a785ef848c8b5667a5a`)
  - Backlog List ID: `ari:cloud:trello::list/workspace/60c9a8ac9046af89b9dd8514/6ab88a7d14244044c587a217`
  - In Progress List ID: `ari:cloud:trello::list/workspace/60c9a8ac9046af89b9dd8514/6ab88a8195827b1cf33d7920`
  - Done List ID: `ari:cloud:trello::list/workspace/60c9a8ac9046af89b9dd8514/6ab88a83477b33376c54b926`
- **Runtimes & Tooling:**
  - Node.js v24 LTS (`v24.21.0`).
  - AI-DLC CLI installed at `C:\Users\Aaron\AppData\Local\aidlc\bin\aidlc.cmd`.
  - Ports: Backend Express/Socket.io `3001` (0.0.0.0), Frontend Vite `5173` (0.0.0.0). LAN IP: `192.168.50.216`.
