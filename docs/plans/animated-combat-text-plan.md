# Plan: Animated Combat Text (Damage & Healing Floating Numbers)

- **Feature Branch:** `feat/animated-damage-healing`
- **Worktree:** `G:\Projects\daily-dungeon-worktrees\animated-damage-healing`
- **Trello Card:** [As a player I want to see animated damage or heal text on the enemies or my parties when combat round resolves](https://trello.com/c/9BDPqgrP/13-as-a-player-i-want-to-see-animated-damage-or-heal-text-on-the-enemies-or-my-parties-when-combat-round-resolves)
- **Status:** Planning / In Review

---

## 1. Goal & Player Experience

When combat rounds resolve, players should immediately and visceral experience the impact of each turn action:
1. **Punchy Floating Damage Numbers:** Crisp, high-contrast crimson/orange text (e.g., `-12`) with bold outlines pops over the hit enemy or hero, scaling up with an energetic bounce before floating upward and fading out.
2. **Smooth Floating Heal & Shield Text:** Luminous emerald green text (e.g., `+15`) floats upward with a soothing glow when heals land. Shield applications appear in ice-blue/cyan (e.g., `+10 🛡️`).
3. **Reactive Impact Animations:** Cards react to the hit simultaneously—taking damage triggers a micro-shake and red edge flash; receiving a heal triggers an emerald ring pulse.
4. **Staggered Step-by-Step Resolution:** As the resolution batch plays through sequentially, each action's numbers appear at the exact moment the action executes, making party collaboration and enemy threats clear and exciting.
5. **Incremental Health Bar Updates:** During turn resolution playback, health bars decrement or increment with each hit rather than waiting for the entire batch to finish, before seamlessly snapping to the authoritative server state.

---

## 2. Invariants & Guardrails

- **Mobile Viewport Invariant:** The battle screen strictly adheres to `h-[100dvh] max-h-[100dvh] overflow-hidden`. Floating combat text uses absolute positioning (`pointer-events-none z-30`) with zero layout shift or document scrolling.
- **Server Authority Invariant:** The client does not invent or calculate combat numbers. Every animated number derives strictly from server-emitted `ResolutionEvent` payloads (`damageDealt`, `healingDone`, `shieldGained`, `dodged`).
- **Performance & Zero Extra Dependencies:** Keyframe animations run entirely on the GPU (`transform: translate3d`, `opacity`, `scale`) using Tailwind CSS and CSS custom properties for 60fps performance on mobile browsers.

---

## 3. Technical Design

### A. CSS Animation Engine (`tailwind.config.js` & `index.css`)
- `@keyframes float-combat-text`:
  - `0%`: Opacity 0, scale 0.5, translateY(8px)
  - `15%`: Opacity 1, scale 1.25 (punchy pop), translateY(-4px)
  - `35%`: Scale 1.0, translateY(-12px)
  - `80%`: Opacity 0.9, translateY(-32px)
  - `100%`: Opacity 0, scale 0.85, translateY(-45px)
- `@keyframes unit-damage-shake`:
  - Quick 350ms micro-shake on unit card (`transform: translateX(-3px) / translateX(3px)`).
- `@keyframes unit-heal-pulse`:
  - Quick 400ms emerald box-shadow / border glow.

### B. Floating Combat Text Component (`packages/client/src/components/FloatingCombatText.tsx`)
- Props: `items: FloatingTextItem[]`
- Interface `FloatingTextItem`:
  ```typescript
  export interface FloatingTextItem {
    id: string;
    targetId: string;
    text: string;
    type: 'damage' | 'heal' | 'shield' | 'dodge';
    offsetX: number; // Random jitter between -18px and +18px to prevent overlapping
    createdAt: number;
  }
  ```
- Renders an absolute, centered overlay over the respective target card with individual animation styling and color themes:
  - `damage`: `text-red-400 drop-shadow-[0_2px_8px_rgba(239,68,68,0.8)] font-black text-lg`
  - `heal`: `text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.8)] font-black text-lg`
  - `shield`: `text-cyan-300 drop-shadow-[0_2px_8px_rgba(6,182,212,0.8)] font-bold text-sm`
  - `dodge`: `text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)] font-black text-sm italic`

### C. Visual Manager Hook (`packages/client/src/hooks/useCombatVisuals.ts`)
- Manages active floating combat text items and cleans up items older than 1200ms.
- Manages active hit impact state per actor ID (`damage_hit` or `heal_hit`) with a 400ms auto-clear.
- Helper `spawnCombatText(event: ResolutionEvent, allPlayers: Record<string, CharacterSheet>)`:
  - Inspects `event.damageDealt`: creates damage item for target (or all alive players if `targetId === 'ALL_PLAYERS'`).
  - Inspects `event.healingDone`: creates heal item for target ally.
  - Inspects `event.shieldGained`: creates shield item for target.
  - Inspects `event.dodged`: creates dodge item for target.
  - Triggers unit shake or heal pulse on target.

### D. Component Integrations
1. **`App.tsx`:**
   - In `handleSequentialPlayback`:
     - For each event in `batch.orderedEvents`:
       - Trigger `spawnCombatText(event, roomState.players)`.
       - Update display HP in state incrementally for immediate visual feedback.
       - Await the 600ms stagger step.
     - Final step: apply `batch.finalRoomState`.
2. **`EnemyCard.tsx`:**
   - Accepts `floatingTexts` and `impactEffect` for the enemy.
   - Renders `FloatingCombatText` positioned over the enemy name/health bar.
   - Applies shake/red flash classes when `impactEffect === 'damage_hit'`.
3. **`PartyCard.tsx`:**
   - Accepts `floatingTexts` and `impactEffects` map.
   - Renders `FloatingCombatText` over the Hero Card (`currentPlayerId`) and over teammate chips (`teammate.id`).
   - Applies shake/glow effects to hero card and teammate chips when impacted.

---

## 4. Implementation Steps (Checklist)

- [ ] **Step 1: CSS Animations Setup**
  - Add keyframes and utility classes in `tailwind.config.js` or `index.css` for floating text pop/drift and unit shake/glow.
- [ ] **Step 2: Floating Combat Text Component (`FloatingCombatText.tsx`)**
  - Create pure presentational component with color variants and GPU-accelerated CSS classes.
- [ ] **Step 3: Visual State Hook (`useCombatVisuals.ts`)**
  - Create hook with automatic timer cleanup and event mapping for single target, self, and `ALL_PLAYERS` AoE.
- [ ] **Step 4: Integrate into `EnemyCard.tsx` and `PartyCard.tsx`**
  - Mount floating text containers with `pointer-events-none overflow-visible`.
  - Connect impact shake and pulse styles.
- [ ] **Step 5: Integrate into `App.tsx` Sequential Playback**
  - Connect `useCombatVisuals` to `handleSequentialPlayback`.
  - Wire incremental health bar updates alongside combat text spawning.
- [ ] **Step 6: Comprehensive Verification**
  - Run `npm run verify:local` (monorepo build, unit tests, DB check, CDK synth, Docker config).
  - Verify zero console errors, zero layout shifts, and mobile viewport constraint compliance.
- [ ] **Step 7: Update Trello & Open Pull Request**
  - Post plan summary and progress to Trello card.
  - Push `feat/animated-damage-healing` and open Pull Request for human review.
