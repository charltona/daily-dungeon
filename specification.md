# Game Design Document & Technical Specification: "Daily Dungeon"

---

## 1. Project Overview & Core Vision

### 1.1 Pitch

*Daily Dungeon* is a cooperative, synchronous, daily micro-RPG designed to be completed in 3 to 4 minutes. It merges the habitual daily-puzzle loop of games like *Wordle* or *Connections* with turn-based D&D-style tactical combat and persistent character progression.

### 1.2 Target Audience & Social Context

* Office/remote teams wrapping up standups, friend groups hanging out over Discord/Slack/WhatsApp.
* Zero installation: fully playable in desktop and mobile web browsers via an instantly shareable room link.

### 1.3 Key Design Pillars

1. **Strict 3–4 Minute Session Cap:** 2 encounters per day (1 Minion Guard + 1 Dungeon Boss). Fast rounds with a strict turn timer keep matches short.
2. **Synchronous, Simultaneous Turns:** Players choose actions at the same time during a 15-second planning window. No waiting around for individual turns.
3. **Speed & Initiative (D&D Style):** Turn resolution order is determined by dynamic speed calculations (`Base Speed + Ability Speed Modifier ± Status Buffs`).
4. **Telegraph & React:** Enemies explicitly display their intentions before players lock in their actions, enabling tactical coordination (taunting, shielding, interrupting, focus-firing).
5. **Persistent Progression & Daily Seed:** One universal dungeon per day. Characters gain XP, levels, and loot that persist across daily runs.

---

## 2. Core Game Loop & Experience

```
[Create Room / Join via Link] 
         │
         ▼
[Party Lobby (2–4 Players)] ──(Leader clicks "Start")──► [Encounter 1: Minion Guard (~1m)]
                                                                    │
                                                               (Guard Defeated)
                                                                    │
                                                                    ▼
                                                         [Encounter 2: Boss (~2m)]
                                                                    │
                                                         ┌──────────┴──────────┐
                                                         ▼                     ▼
                                                 [Victory Screen]       [Defeat Screen]
                                                 (XP/Loot Card)         (1 Quick Retry)

```

### 2.1 The Two Encounters

* **Encounter 1: The Guard (Minion Pack):**
* Serves as a warm-up and resource builder (Rage for Warrior, Combo Points for Rogue, Mana management for Priest).
* 2 to 3 rounds max (~45–60 seconds). Low lethal threat, simple predictable mechanics.


* **Encounter 2: The Crypt Boss:**
* Features a telegraphed high-threat ability (e.g., charge-up round, heavy cleave, or elemental immunity).
* 4 to 5 rounds max (~1.5–2.5 minutes). Demands group coordination (e.g., Warrior intercepts, Priest cleanses/heals, Rogue strips armor).



---

## 3. Combat Mechanics & Systems

### 3.1 Turn Flow (The 15-Second Loop)

Each combat round is broken into two distinct phases:

1. **Planning Phase (15 Seconds):**
* The server broadcasts the enemy's telegraphed intent for the round (Target, Action Name, Base Initiative).
* Players select their action (1 ability + 1 target) and click **Lock In**.
* If the 15-second timer expires, any unselected player automatically casts their default basic attack on the main target.


2. **Resolution Phase (3–4 Seconds Staggered Animation):**
* The server pools all queued actions (players + enemy).
* Actions are sorted from highest to lowest Speed.
* Actions execute sequentially down the initiative track.
* Health bars update, floating status tags display, and an auto-scrolling combat log narrates the round.



### 3.2 Dynamic Initiative Formula

$$\text{Calculated Speed} = \text{Character Base Speed} + \text{Ability Speed Modifier} \pm \text{Status Modifiers}$$

* Ties in initiative are resolved in favor of players over enemies; if players tie, tie-break arbitrarily by join order.
* **Dead Actor Rule:** If a unit's HP reaches 0, any pending queued actions from that unit later in the turn are canceled.

### 3.3 Dynamic Party Scaling

Base enemy stats are tuned for 1 player, then automatically scaled to party size ($N = 2 \text{ to } 4$):


$$\text{Enemy Max HP} = \text{Base HP} \times [1 + 0.6 \times (N - 1)]$$

$$\text{Enemy Damage} = \text{Base Damage} \times [1 + 0.25 \times (N - 1)]$$

---

## 4. Starter Classes (Level 1 Prototype)

### 4.1 Rogue

* **Base Speed:** 15 (Fastest; consistently moves before standard enemies)
* **Resource:** Combo Points (Starts at 0, max 5)
* **Abilities:**
1. *Twin Daggers:* (Speed: +2, Cost: 0). Deal 8 Physical Damage. Generates +1 Combo Point.
2. *Expose Weakness:* (Speed: +4, Cost: 2 Combo Points). Target takes +30% damage from all sources until the end of the round.
3. *Smoke Screen:* (Speed: 0, Cost: 1 Combo Point). Target ally gains +5 Speed and dodges the next single-target attack directed at them this round.



### 4.2 Warrior

* **Base Speed:** 10 (Moderate speed; moves around the same time as mid-tier enemies)
* **Resource:** Rage (Starts at 0, max 100; generates upon attacking and taking damage)
* **Abilities:**
1. *Slash:* (Speed: 0, Cost: 0). Deal 10 Physical Damage. Generates +15 Rage.
2. *Intervene:* (Speed: +3, Cost: 10 Rage). Target an ally. Intercept the next attack targeted at that ally, taking the hit with 25% damage reduction.
3. *Reckless Strike:* (Speed: -3, Cost: 25 Rage). Deal 22 Heavy Physical Damage.



### 4.3 Priest

* **Base Speed:** 7 (Slow; acts reactively after enemies strike)
* **Resource:** Mana (Starts at 40, max 40; regenerates 5 per round)
* **Abilities:**
1. *Smite:* (Speed: 0, Cost: 0). Deal 7 Holy Damage. Reduces the target's speed by -3 on the following round.
2. *Flash Heal:* (Speed: +1, Cost: 12 Mana). Restore 12 HP to target ally.
3. *Sanctuary:* (Speed: -2, Cost: 20 Mana). Grants target ally a damage shield equal to 15 HP for 1 round.



---

## 5. Prototype Enemy Design

### 5.1 Minion: Skeletal Vanguard

* **Base HP:** 45 | **Base Speed:** 9
* **Intent Pattern:**
* Round 1: *Rusted Blade* (Speed: 0) $\rightarrow$ Deals 6 Physical Damage to highest-HP player.
* Round 2: *Shield Bash* (Speed: +1) $\rightarrow$ Deals 8 Physical Damage to target with lowest current speed.



### 5.2 Boss: Crypt Overseer

* **Base HP:** 110 | **Base Speed:** 8
* **Intent Pattern:**
* Round 1: *Shadow Bolt* (Speed: 0) $\rightarrow$ Deals 10 Magic Damage to lowest-HP player.
* Round 2: *Telegraph: Charging [Soul Cleave]* (Speed: -4) $\rightarrow$ Incoming party-wide attack for 18 damage next round.
* Round 3: *Soul Cleave* executes.
* Round 4: *Bone Armor* (Speed: +2) $\rightarrow$ Shields self for 20 HP.



---

## 6. Technical Architecture & Specification

### 6.1 Architecture Overview

The system follows a strict **Authoritative Server / Thin Client** model. The server maintains the master clock, manages room states, and calculates all math, combat resolution, and state updates. Clients only render current state and dispatch user intent.

* **Frontend:** React (Vite or Next.js App Router) + Tailwind CSS.
* **Backend:** Node.js + TypeScript (`express` or standalone server).
* **Networking:** WebSocket (`Socket.io` recommended for native room management and reconnection semantics).
* **State Storage (Prototype Phase):** In-memory JS Map for active rooms; character profiles stored in local memory or a lightweight JSON/SQLite store.

---

### 6.2 Data Models & TypeScript Contracts

```typescript
// Shared Types (shared between client and server)

export type ClassType = 'warrior' | 'rogue' | 'priest';
export type ActorType = 'player' | 'enemy';

export interface CharacterSheet {
  id: string;
  name: string;
  classType: ClassType;
  level: number;
  maxHp: number;
  currentHp: number;
  resourceType: 'rage' | 'combo' | 'mana';
  maxResource: number;
  currentResource: number;
  baseSpeed: number;
}

export interface EnemyUnit {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  baseSpeed: number;
  telegraphedAction: TelegraphedAction | null;
}

export interface TelegraphedAction {
  abilityName: string;
  targetId: string; // Actor ID or 'ALL_PLAYERS'
  projectedDamage: number;
  speed: number;
  description: string;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  speedModifier: number;
  resourceCost: number;
  targetType: 'single_enemy' | 'single_ally' | 'self';
}

export interface QueuedAction {
  actorId: string;
  actorType: ActorType;
  abilityId: string;
  targetId: string;
  calculatedSpeed: number;
}

export type RoomStatus = 
  | 'LOBBY' 
  | 'COMBAT_INPUT' 
  | 'COMBAT_RESOLUTION' 
  | 'STAGE_TRANSITION' 
  | 'VICTORY' 
  | 'DEFEAT';

export interface RoomState {
  roomId: string;
  hostPlayerId: string;
  status: RoomStatus;
  stage: 1 | 2; // 1: Minion, 2: Boss
  roundNumber: number;
  turnTimerSeconds: number;
  players: Record<string, CharacterSheet>;
  enemy: EnemyUnit | null;
  lockedPlayerIds: string[];
  combatLog: string[];
}

```

---

### 6.3 WebSocket Event Specifications

#### Client $\rightarrow$ Server Events

1. `room:join`
* **Payload:** `{ roomId: string, character: CharacterSheet }`
* **Action:** Adds socket to room; broadcasts updated room state.


2. `room:start`
* **Payload:** `{ roomId: string }`
* **Validation:** Caller must be `hostPlayerId`. Transitions status to `COMBAT_INPUT`.


3. `combat:lock_action`
* **Payload:** `{ roomId: string, abilityId: string, targetId: string }`
* **Action:** Records player's action. If all connected players have locked in, immediately triggers turn resolution.



#### Server $\rightarrow$ Client Events

1. `room:state_update`
* **Payload:** `RoomState`
* **Frequency:** Broadcast on every state change, player join/leave, lock-in, and phase shift.


2. `combat:timer_tick`
* **Payload:** `{ remainingSeconds: number }`
* **Frequency:** Broadcast once per second during `COMBAT_INPUT`.


3. `combat:resolution_batch`
* **Payload:**
```typescript
interface ResolutionBatch {
  orderedEvents: {
    actorId: string;
    actorName: string;
    abilityName: string;
    targetId: string;
    damageDealt?: number;
    healingDone?: number;
    message: string;
  }[];
  finalRoomState: RoomState;
}

```


* **Action:** Client plays back events sequentially with short UI delays (e.g., 600ms per event) before enabling the next round.



---

### 6.4 Server-Side Turn Resolution Logic

```typescript
function resolveTurn(room: RoomState): ResolutionBatch {
  const events = [];
  
  // 1. Compile all player actions + enemy action into a single action pool
  const actionPool: QueuedAction[] = compileActionPool(room);

  // 2. Sort pool strictly by calculated speed descending
  actionPool.sort((a, b) => b.calculatedSpeed - a.calculatedSpeed);

  // 3. Sequential evaluation
  for (const action of actionPool) {
    // Abort action if caster died earlier this round
    if (!isActorAlive(room, action.actorId)) continue;

    // Apply ability effects (damage calculations, healing, buffs)
    const eventResult = applyActionEffects(room, action);
    events.push(eventResult);

    // Check early termination conditions
    if (room.enemy!.currentHp <= 0) {
      handleEncounterVictory(room);
      break;
    }
    if (allPlayersDead(room)) {
      room.status = 'DEFEAT';
      break;
    }
  }

  // 4. Telegraphed intent for next round (if enemy still alive)
  if (room.enemy && room.enemy.currentHp > 0) {
    room.enemy.telegraphedAction = calculateNextEnemyIntent(room);
  }

  return { orderedEvents: events, finalRoomState: room };
}

```

---

## 7. User Interface Layout Specification (Text/DOM UI)

The UI must avoid heavy canvas rendering in the prototype. Use clean semantic HTML and Tailwind CSS card components:

```
┌────────────────────────────────────────────────────────────────────────┐
│  ROOM: [ CRYPT-42 ]  |  DAILY DUNGEON: THE SUNKEN CRYPT  |  TIMER: [ 12s ]│
├────────────────────────────────────────────────────────────────────────┤
│  INITIATIVE TRACK:                                                     │
│  [17: Rogue] ➔ [13: Warrior] ➔ [9: Skeleton Vanguard] ➔ [7: Priest]   │
├────────────────────────────────────────────────────────────────────────┤
│  ENEMY ENCOUNTER:                                                      │
│  [ Skeleton Vanguard ]                                                 │
│  HP: [████████████████░░░░] 32/45                                      │
│  ⚠️ INTENT: Winding up [Rusted Blade] on Warrior (Initiative 9)        │
├────────────────────────────────────────────────────────────────────────┤
│  PARTY STATUS:                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Brog (Warrior) ✅ │  │ Val (Rogue)   ✅ │  │ Elia (Priest) ⏳ │      │
│  │ HP: 28/35        │  │ HP: 20/22        │  │ HP: 18/18        │      │
│  │ Rage: 45/100     │  │ Combo: 2/5       │  │ Mana: 28/40      │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
├────────────────────────────────────────────────────────────────────────┤
│  COMBAT FEED:                                                          │
│  > Val used [Twin Daggers] on Skeleton Vanguard for 8 DMG!             │
│  > Skeleton Vanguard struck Brog for 6 DMG.                            │
│  > Elia used [Flash Heal] on Brog for +12 HP.                          │
├────────────────────────────────────────────────────────────────────────┤
│  YOUR ACTIONS (Warrior):                                               │
│  [ (1) Slash (+0 Spd) ]  [ (2) Intervene (+3 Spd) ]  [ (3) Reckless ]  │
│  Target: [ Enemy ▼ ]                           [ LOCK IN ACTION ]      │
└────────────────────────────────────────────────────────────────────────┘

```

---

## 8. Instructions for Antigravity

> **Agent Directive:**
> You are tasked with implementing the full-stack prototype of *Daily Dungeon* according to this document.
> 1. Review the data models, state flow, and starter class mechanics.
> 2. Keep the architecture modular: isolate the **Combat Engine (pure calculation logic)** from the **Network/Socket Transport Layer**.
> 3. Implement the prototype using **TypeScript** for both server and client.
> 4. **Important:** Before writing boilerplate or scaffold code, halt and present any questions or ambiguities you need clarified regarding:
> * Database persistence preferences (pure in-memory prototype vs. SQLite/Postgres).
> * Preferred project structuring (monorepo vs. separate client/server directories).
> * Specific CSS/component library preferences (pure Tailwind vs. shadcn/ui components).
> 
> 
> 
>