# Daily Dungeon ⚔️

A synchronous, cooperative daily micro-RPG prototype designed to be completed in 3 to 4 minutes. Merges daily-puzzle loops with turn-based D&D tactical combat and persistent progression.

## Tech Stack & Architecture

- **Runtime:** Node.js v24 LTS + npm workspaces
- **Core Engine (`packages/shared`):** Pure calculation logic, zero external network/framework dependencies. Fully unit-tested. Handles dynamic initiative, turn resolution pipeline, buff/debuff/shield calculations, and party scaling.
- **Authoritative Backend (`packages/server`):** Node.js + Express + Socket.io. Authoritative 15-second planning timer, room management (`socket.join(roomId)`), default attack fallback on timer expiration, and synchronized state broadcast.
- **Client (`packages/client`):** React 18 + Vite + Tailwind CSS + Lucide Icons. Pure DOM cards and progress bars, dynamic initiative track, telegraph warnings, responsive party status, action bar with keyboard shortcuts (`1`, `2`, `3`), and sequential combat event playback.

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Both Server & Client
```bash
npm run dev
```
- **Backend Server:** `http://localhost:3001`
- **Frontend App:** `http://localhost:5173`

### 3. Run Unit Tests
```bash
npm test
```

---

## How to Play

1. Open `http://localhost:5173` in your browser.
2. Select your class (**Warrior**, **Rogue**, or **Priest**), and use the automatically randomised room code (or enter your own / re-roll with the dice button).
3. Open a second browser tab (or incognito window) with the same room code or invite link to test multi-player co-op!
4. The host clicks **"Descend into Crypt (Start Encounter)"**.
5. Each round, you have **15 seconds** to:
   - Read the enemy's **telegraphed intent** (who they are targeting and what attack they are winding up).
   - Coordinate actions (e.g. Warrior intervenes to protect low-HP ally, Rogue strips armor or casts smoke screen, Priest heals or smites).
   - Click **"Lock In Action"** (or press keys `1`, `2`, `3` then Enter).
6. When all players lock in (or timer expires), the server executes turn resolution along the initiative track and streams the play-by-play animation to all clients!
