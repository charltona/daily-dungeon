# ADR 0001: Native Self-Hosted Authentication & Session Architecture

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Engineering & Product

---

## Context & Problem Statement
*Daily Dungeon* is a fast, synchronous cooperative daily micro-RPG designed for rapid, friction-free play sessions (3–4 minutes per run). 

As we prepare for cloud deployment and multiplayer matchmaking, we require user authentication to:
1. Associate players authoritatively with their character sheets, run streaks, and inventory.
2. Prevent impersonation / spoofing of `playerId` over WebSockets.
3. Allow players to access their characters across mobile and desktop devices.

We evaluated third-party identity-as-a-service (IDaaS) platforms (e.g. Clerk, Auth0, Okta), but rejected them due to:
- Monthly Active User (MAU) pricing tiers and vendor lock-in.
- Heavy client bundle size and redirect latency.
- High barrier to entry: forcing email/password sign-up before playing causes significant drop-off for casual mobile playtests.

---

## Decision Outcome
We decided to implement a **native, self-hosted session authentication system** directly inside the authoritative server (`@daily-dungeon/server`) backed by our application database (PostgreSQL/SQLite).

### 1. Database Schema Design
Authentication and identity live in two dedicated tables:
```sql
-- 1. User Identity
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    VARCHAR(32) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    oauth_provider  VARCHAR(32),                  -- 'google', 'discord', or NULL (guest)
    oauth_id        VARCHAR(255) UNIQUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sessions (Hashed Tokens)
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of the random session token
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Persistent Character Sheets (Linked to User)
CREATE TABLE characters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_type      VARCHAR(16) NOT NULL,
    total_runs      INTEGER DEFAULT 0,
    victories       INTEGER DEFAULT 0,
    inventory_json  JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Session Token Storage & Transport
- **Token Generation:** Cryptographically secure 256-bit random hex strings (`crypto.randomBytes(32).toString('hex')`).
- **Database Storage:** Only the SHA-256 hash of the token is persisted in the `sessions` table (preventing token compromise if the database is leaked).
- **Client Transport:** Transmitted strictly via `HttpOnly`, `Secure`, `SameSite=Lax` cookies named `session_token`.
- **Zero LocalStorage Tokens:** Eliminates XSS token exfiltration risks.

### 3. Onboarding & Authentication Flow (Guest First $\rightarrow$ Optional OAuth)
1. **First Visit (Frictionless Guest):**
   - If no valid `session_token` cookie is present, server transparently creates an anonymous `user` record and sets the session cookie.
   - Player immediately joins or creates rooms without friction.
2. **Account Linking (Optional):**
   - Player can link their account via native Google or Discord OAuth 2.0 (handled directly in 2 Express routes: `/api/auth/[provider]` and `/api/auth/[provider]/callback`).
   - Merges the anonymous guest identity into the authenticated OAuth identity, preserving character progression and streaks.

### 4. Socket.io Handshake Authentication
Socket.io connections are authenticated at connection time using middleware:
```ts
io.use(async (socket, next) => {
  const token = parseCookie(socket.handshake.headers.cookie)['session_token'];
  const user = await resolveUserFromToken(token);
  if (!user) return next(new Error('Unauthorized'));
  socket.data.user = user;
  next();
});
```
The game engine authoritatively identifies players via `socket.data.user.id`, never trusting client-supplied player IDs.

---

## Consequences
- **Positive:** Zero SaaS subscription fees, zero vendor lock-in, complete data ownership.
- **Positive:** Low friction for testing; players can drop straight into a game link on mobile without registration forms.
- **Positive:** Authoritative security over WebSockets from the initial handshake.
- **Trade-off:** We maintain the user and session tables and OAuth exchange logic ourselves rather than delegating to an external SDK.
