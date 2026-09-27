import {
  CharacterSheet,
  EnemyUnit,
  QueuedAction,
  ResolutionBatch,
  ResolutionEvent,
  RoomState,
  TelegraphedAction,
} from './types.js';
import { BASE_ENEMIES, CLASS_ABILITIES, CLASS_BASE_STATS } from './constants.js';

export function calculatePartyScaling(partySize: number) {
  const n = Math.max(1, partySize);
  const hpMultiplier = 1 + 0.6 * (n - 1);
  const damageMultiplier = 1 + 0.25 * (n - 1);
  return { hpMultiplier, damageMultiplier };
}

export function createScaledEnemy(stage: 1 | 2, partySize: number): EnemyUnit {
  const base = stage === 1 ? BASE_ENEMIES.minion : BASE_ENEMIES.boss;
  const { hpMultiplier } = calculatePartyScaling(partySize);
  const scaledHp = Math.round(base.baseHp * hpMultiplier);

  const enemy: EnemyUnit = {
    id: base.id,
    name: base.name,
    maxHp: scaledHp,
    currentHp: scaledHp,
    baseSpeed: base.baseSpeed,
    telegraphedAction: null,
  };

  return enemy;
}

export function calculateNextEnemyIntent(room: RoomState): TelegraphedAction {
  const { damageMultiplier } = calculatePartyScaling(Object.keys(room.players).length);
  const alivePlayers = Object.values(room.players).filter((p) => p.currentHp > 0);

  // Fallback target if everyone is down
  const defaultTarget = alivePlayers[0]?.id || Object.keys(room.players)[0] || 'ALL_PLAYERS';

  if (room.stage === 1) {
    // Minion: Skeletal Vanguard
    if (room.roundNumber % 2 === 1) {
      // Round 1 (and odd rounds): Rusted Blade -> highest-HP player
      let target = alivePlayers[0] || room.players[defaultTarget];
      for (const p of alivePlayers) {
        if (p.currentHp > target.currentHp) target = p;
      }
      const rawDmg = 6;
      const projected = Math.round(rawDmg * damageMultiplier);
      return {
        abilityName: 'Rusted Blade',
        targetId: target.id,
        projectedDamage: projected,
        speed: 9 + 0, // base 9 + speed mod 0
        description: `Stikes ${target.name} for ${projected} Physical Damage.`,
      };
    } else {
      // Round 2 (and even rounds): Shield Bash -> lowest current speed player
      let target = alivePlayers[0] || room.players[defaultTarget];
      for (const p of alivePlayers) {
        const speedP = p.baseSpeed + (p.speedModifier || 0);
        const speedTarget = target.baseSpeed + (target.speedModifier || 0);
        if (speedP < speedTarget) target = p;
      }
      const rawDmg = 8;
      const projected = Math.round(rawDmg * damageMultiplier);
      return {
        abilityName: 'Shield Bash',
        targetId: target.id,
        projectedDamage: projected,
        speed: 9 + 1, // base 9 + speed mod 1
        description: `Bashes ${target.name} for ${projected} Physical Damage.`,
      };
    }
  } else {
    // Boss: Crypt Overseer
    const roundInCycle = ((room.roundNumber - 1) % 4) + 1;
    switch (roundInCycle) {
      case 1: {
        // Shadow Bolt -> lowest-HP player
        let target = alivePlayers[0] || room.players[defaultTarget];
        for (const p of alivePlayers) {
          if (p.currentHp < target.currentHp) target = p;
        }
        const rawDmg = 6;
        const projected = Math.round(rawDmg * damageMultiplier);
        return {
          abilityName: 'Shadow Bolt',
          targetId: target.id,
          projectedDamage: projected,
          speed: 8 + 0,
          description: `Hurls dark magic at ${target.name} for ${projected} Magic Damage.`,
        };
      }
      case 2: {
        // Telegraph: Charging [Soul Cleave]
        const projected = Math.round(9 * damageMultiplier);
        return {
          abilityName: 'Charging [Soul Cleave]',
          targetId: 'ALL_PLAYERS',
          projectedDamage: 0,
          speed: 8 - 4, // 4 initiative
          description: `Overseer channels dark energy! Preparing party-wide cleave for ${projected} DMG next round!`,
        };
      }
      case 3: {
        // Soul Cleave executes
        const projected = Math.round(9 * damageMultiplier);
        return {
          abilityName: 'Soul Cleave',
          targetId: 'ALL_PLAYERS',
          projectedDamage: projected,
          speed: 8 + 0,
          description: `Unleashes Soul Cleave dealing ${projected} Shadow Damage to all party members!`,
        };
      }
      case 4:
      default: {
        // Bone Armor
        return {
          abilityName: 'Bone Armor',
          targetId: room.enemy?.id || 'self',
          projectedDamage: 0,
          speed: 8 + 2,
          description: `Summons skeletal bone plates granting 10 Shield HP.`,
        };
      }
    }
  }
}

export function compileInitiativeTrack(
  room: RoomState,
  queuedPlayerActions: Record<string, { abilityId: string; targetId: string }>
): QueuedAction[] {
  const pool: QueuedAction[] = [];

  // Players
  for (const [playerId, player] of Object.entries(room.players)) {
    if (player.currentHp <= 0) continue;
    const queued = queuedPlayerActions[playerId];
    let abilityId = queued?.abilityId;
    let targetId = queued?.targetId;

    const abilities = CLASS_ABILITIES[player.classType];
    let ability = abilities.find((a) => a.id === abilityId);

    // Fallback to basic attack (ability index 0)
    if (!ability) {
      ability = abilities[0];
      abilityId = ability.id;
      targetId = room.enemy?.id || '';
    }

    const calculatedSpeed = player.baseSpeed + ability.speedModifier + (player.speedModifier || 0);

    pool.push({
      actorId: player.id,
      actorType: 'player',
      abilityId,
      targetId: targetId || (room.enemy?.id ?? ''),
      calculatedSpeed,
    });
  }

  // Enemy
  if (room.enemy && room.enemy.currentHp > 0 && room.enemy.telegraphedAction) {
    pool.push({
      actorId: room.enemy.id,
      actorType: 'enemy',
      abilityId: room.enemy.telegraphedAction.abilityName,
      targetId: room.enemy.telegraphedAction.targetId,
      calculatedSpeed: room.enemy.telegraphedAction.speed + (room.enemy.speedModifier || 0),
    });
  }

  // Sort pool strictly by calculated speed descending
  // Section 3.2: Ties in initiative are resolved in favor of players over enemies;
  // if players tie, tie-break arbitrarily by join order (stable player order)
  pool.sort((a, b) => {
    if (b.calculatedSpeed !== a.calculatedSpeed) {
      return b.calculatedSpeed - a.calculatedSpeed;
    }
    if (a.actorType === 'player' && b.actorType === 'enemy') return -1;
    if (a.actorType === 'enemy' && b.actorType === 'player') return 1;
    return 0;
  });

  return pool;
}

export function resolveTurn(
  initialRoom: RoomState,
  queuedPlayerActions: Record<string, { abilityId: string; targetId: string }>
): ResolutionBatch {
  // Deep clone to ensure immutability & pure functional resolution
  const room: RoomState = JSON.parse(JSON.stringify(initialRoom));
  const events: ResolutionEvent[] = [];

  // Active status trackers for this round
  let enemyDamageTakenMultiplier = 1.0;
  const interceptMap = new Map<string, string>(); // targetId -> interceptorPlayerId
  const dodgeSet = new Set<string>(); // actorIds with active dodge

  // Reset temporary speed modifiers from previous round on actors
  for (const player of Object.values(room.players)) {
    player.speedModifier = 0;
    player.shield = player.shield || 0;
  }
  if (room.enemy) {
    room.enemy.speedModifier = 0;
  }

  // Compile and sort actions
  const actionPool = compileInitiativeTrack(room, queuedPlayerActions);

  const { damageMultiplier } = calculatePartyScaling(Object.keys(room.players).length);

  for (const action of actionPool) {
    // Dead Actor Rule: If a unit's HP reaches 0, any pending queued actions are canceled.
    if (action.actorType === 'player') {
      const p = room.players[action.actorId];
      if (!p || p.currentHp <= 0) continue;
    } else if (action.actorType === 'enemy') {
      if (!room.enemy || room.enemy.currentHp <= 0) continue;
    }

    if (action.actorType === 'player') {
      const player = room.players[action.actorId];
      const abilities = CLASS_ABILITIES[player.classType];
      const ability = abilities.find((a) => a.id === action.abilityId) || abilities[0];

      // Deduct resource cost if available, otherwise fallback to basic attack
      let actualAbility = ability;
      if (player.currentResource < ability.resourceCost) {
        actualAbility = abilities[0];
      }
      player.currentResource = Math.max(0, player.currentResource - actualAbility.resourceCost);

      switch (actualAbility.id) {
        // Rogue abilities
        case 'rogue_twin_daggers': {
          if (!room.enemy || room.enemy.currentHp <= 0) break;
          const baseDmg = 8;
          const finalDmg = Math.round(baseDmg * enemyDamageTakenMultiplier);
          const actualDmg = applyDamageToEnemy(room.enemy, finalDmg);
          player.currentResource = Math.min(player.maxResource, player.currentResource + 1);

          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: room.enemy.id,
            targetName: room.enemy.name,
            damageDealt: actualDmg,
            message: `${player.name} strikes with Twin Daggers for ${actualDmg} DMG! (+1 Combo Point)`,
          });
          break;
        }
        case 'rogue_expose_weakness': {
          if (!room.enemy || room.enemy.currentHp <= 0) break;
          enemyDamageTakenMultiplier = 1.3;
          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: room.enemy.id,
            targetName: room.enemy.name,
            message: `${player.name} exposes ${room.enemy.name}'s weakness! Target takes +30% damage this round!`,
          });
          break;
        }
        case 'rogue_smoke_screen': {
          const targetAlly = room.players[action.targetId] || player;
          targetAlly.speedModifier = (targetAlly.speedModifier || 0) + 5;
          dodgeSet.add(targetAlly.id);
          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: targetAlly.id,
            targetName: targetAlly.name,
            message: `${player.name} casts Smoke Screen on ${targetAlly.name}! (+5 Speed & dodges next attack)`,
          });
          break;
        }

        // Warrior abilities
        case 'warrior_slash': {
          if (!room.enemy || room.enemy.currentHp <= 0) break;
          const baseDmg = 10;
          const finalDmg = Math.round(baseDmg * enemyDamageTakenMultiplier);
          const actualDmg = applyDamageToEnemy(room.enemy, finalDmg);
          player.currentResource = Math.min(player.maxResource, player.currentResource + 15);

          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: room.enemy.id,
            targetName: room.enemy.name,
            damageDealt: actualDmg,
            message: `${player.name} slashes ${room.enemy.name} for ${actualDmg} DMG! (+15 Rage)`,
          });
          break;
        }
        case 'warrior_intervene': {
          const targetAlly = room.players[action.targetId] || player;
          if (targetAlly.id !== player.id) {
            interceptMap.set(targetAlly.id, player.id);
          }
          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: targetAlly.id,
            targetName: targetAlly.name,
            message: `${player.name} prepares to Intervene for ${targetAlly.name}!`,
          });
          break;
        }
        case 'warrior_reckless_strike': {
          if (!room.enemy || room.enemy.currentHp <= 0) break;
          const baseDmg = 22;
          const finalDmg = Math.round(baseDmg * enemyDamageTakenMultiplier);
          const actualDmg = applyDamageToEnemy(room.enemy, finalDmg);

          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: room.enemy.id,
            targetName: room.enemy.name,
            damageDealt: actualDmg,
            message: `${player.name} lands a heavy Reckless Strike on ${room.enemy.name} for ${actualDmg} DMG!`,
          });
          break;
        }

        // Priest abilities
        case 'priest_smite': {
          if (!room.enemy || room.enemy.currentHp <= 0) break;
          const baseDmg = 7;
          const finalDmg = Math.round(baseDmg * enemyDamageTakenMultiplier);
          const actualDmg = applyDamageToEnemy(room.enemy, finalDmg);
          // Reduces target's speed by 3 next round
          room.enemy.speedModifier = (room.enemy.speedModifier || 0) - 3;

          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: room.enemy.id,
            targetName: room.enemy.name,
            damageDealt: actualDmg,
            message: `${player.name} smites ${room.enemy.name} for ${actualDmg} Holy DMG! (-3 Speed applied)`,
          });
          break;
        }
        case 'priest_flash_heal': {
          const targetAlly = room.players[action.targetId] || player;
          const healAmount = 12;
          const oldHp = targetAlly.currentHp;
          targetAlly.currentHp = Math.min(targetAlly.maxHp, targetAlly.currentHp + healAmount);
          const actualHealed = targetAlly.currentHp - oldHp;

          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: targetAlly.id,
            targetName: targetAlly.name,
            healingDone: actualHealed,
            message: `${player.name} casts Flash Heal on ${targetAlly.name} (+${actualHealed} HP)!`,
          });
          break;
        }
        case 'priest_sanctuary': {
          const targetAlly = room.players[action.targetId] || player;
          const shieldAmount = 15;
          targetAlly.shield = (targetAlly.shield || 0) + shieldAmount;

          events.push({
            actorId: player.id,
            actorName: player.name,
            abilityName: actualAbility.name,
            targetId: targetAlly.id,
            targetName: targetAlly.name,
            shieldGained: shieldAmount,
            message: `${player.name} blankets ${targetAlly.name} with Sanctuary (+15 Shield)!`,
          });
          break;
        }
      }

      // Check if enemy died after player action
      if (room.enemy && room.enemy.currentHp <= 0) {
        room.enemy.currentHp = 0;
        events.push({
          actorId: room.enemy.id,
          actorName: room.enemy.name,
          abilityName: 'Death',
          targetId: room.enemy.id,
          message: `💀 ${room.enemy.name} has been vanquished!`,
        });
        handleEncounterVictory(room, events);
        break;
      }
    } else if (action.actorType === 'enemy' && room.enemy && room.enemy.currentHp > 0) {
      // Enemy Action
      const enemy = room.enemy;
      const telegraphed = enemy.telegraphedAction;
      if (!telegraphed) continue;

      if (telegraphed.abilityName === 'Bone Armor') {
        enemy.shield = (enemy.shield || 0) + 10;
        events.push({
          actorId: enemy.id,
          actorName: enemy.name,
          abilityName: telegraphed.abilityName,
          targetId: enemy.id,
          targetName: enemy.name,
          shieldGained: 10,
          message: `${enemy.name} casts Bone Armor (+10 Shield HP)!`,
        });
      } else if (telegraphed.abilityName === 'Charging [Soul Cleave]') {
        events.push({
          actorId: enemy.id,
          actorName: enemy.name,
          abilityName: telegraphed.abilityName,
          targetId: 'ALL_PLAYERS',
          message: `⚡ ${enemy.name} is gathering catastrophic dark energy for next round!`,
        });
      } else if (telegraphed.targetId === 'ALL_PLAYERS') {
        // AoE attack like Soul Cleave
        const damagePerPlayer = telegraphed.projectedDamage;
        for (const p of Object.values(room.players)) {
          if (p.currentHp <= 0) continue;
          const dealt = applyDamageToPlayer(p, damagePerPlayer);
          events.push({
            actorId: enemy.id,
            actorName: enemy.name,
            abilityName: telegraphed.abilityName,
            targetId: p.id,
            targetName: p.name,
            damageDealt: dealt,
            message: `${enemy.name}'s Soul Cleave sweeps through ${p.name} for ${dealt} DMG!`,
          });
        }
      } else {
        // Single target attack
        let targetPlayer = room.players[telegraphed.targetId];
        // If target died or invalid, pick first alive player
        if (!targetPlayer || targetPlayer.currentHp <= 0) {
          targetPlayer = Object.values(room.players).find((p) => p.currentHp > 0) as CharacterSheet;
        }

        if (targetPlayer) {
          // Check dodge
          if (dodgeSet.has(targetPlayer.id)) {
            dodgeSet.delete(targetPlayer.id);
            events.push({
              actorId: enemy.id,
              actorName: enemy.name,
              abilityName: telegraphed.abilityName,
              targetId: targetPlayer.id,
              targetName: targetPlayer.name,
              dodged: true,
              message: `${targetPlayer.name} swiftly dodges ${enemy.name}'s ${telegraphed.abilityName}!`,
            });
          } else {
            // Check Intervene
            const interceptorId = interceptMap.get(targetPlayer.id);
            const interceptor = interceptorId ? room.players[interceptorId] : null;

            if (interceptor && interceptor.currentHp > 0) {
              const rawDmg = telegraphed.projectedDamage;
              const reducedDmg = Math.round(rawDmg * 0.75); // 25% damage reduction
              const dealt = applyDamageToPlayer(interceptor, reducedDmg);

              // Interceptor gains rage from taking damage
              if (interceptor.resourceType === 'rage') {
                interceptor.currentResource = Math.min(interceptor.maxResource, interceptor.currentResource + 10);
              }

              events.push({
                actorId: enemy.id,
                actorName: enemy.name,
                abilityName: telegraphed.abilityName,
                targetId: interceptor.id,
                targetName: interceptor.name,
                interceptedBy: interceptor.name,
                damageDealt: dealt,
                message: `🛡️ ${interceptor.name} leaped in front of ${targetPlayer.name} with Intervene, absorbing ${dealt} DMG (25% reduced)!`,
              });
            } else {
              const dealt = applyDamageToPlayer(targetPlayer, telegraphed.projectedDamage);
              // Warrior generates rage from taking damage
              if (targetPlayer.resourceType === 'rage') {
                targetPlayer.currentResource = Math.min(targetPlayer.maxResource, targetPlayer.currentResource + 10);
              }

              events.push({
                actorId: enemy.id,
                actorName: enemy.name,
                abilityName: telegraphed.abilityName,
                targetId: targetPlayer.id,
                targetName: targetPlayer.name,
                damageDealt: dealt,
                message: `${enemy.name} hits ${targetPlayer.name} with ${telegraphed.abilityName} for ${dealt} DMG!`,
              });
            }
          }
        }
      }

      // Check if all players dead
      if (allPlayersDead(room)) {
        room.status = 'DEFEAT';
        events.push({
          actorId: enemy.id,
          actorName: enemy.name,
          abilityName: 'Party Wipe',
          targetId: 'ALL_PLAYERS',
          message: `💀 The party has fallen. The dungeon claims another soul.`,
        });
        break;
      }
    }
  }

  // Round wrap-up: Regenerate Priest mana (5 per round)
  for (const p of Object.values(room.players)) {
    if (p.currentHp > 0 && p.resourceType === 'mana') {
      p.currentResource = Math.min(p.maxResource, p.currentResource + 5);
    }
    // Expire temp shields if not already consumed
    p.shield = 0;
  }

  // If combat is still ongoing, advance round and prepare next enemy intent
  if (room.status === 'COMBAT_INPUT' || room.status === 'COMBAT_RESOLUTION') {
    if (room.enemy && room.enemy.currentHp > 0 && !allPlayersDead(room)) {
      room.roundNumber += 1;
      room.status = 'COMBAT_INPUT';
      room.enemy.telegraphedAction = calculateNextEnemyIntent(room);
    }
  }

  // Clear locked player IDs for next round
  room.lockedPlayerIds = [];
  room.queuedActions = {};

  return {
    orderedEvents: events,
    finalRoomState: room,
  };
}

function applyDamageToEnemy(enemy: EnemyUnit, amount: number): number {
  let remaining = amount;
  if (enemy.shield && enemy.shield > 0) {
    if (enemy.shield >= remaining) {
      enemy.shield -= remaining;
      return amount;
    } else {
      remaining -= enemy.shield;
      enemy.shield = 0;
    }
  }
  enemy.currentHp = Math.max(0, enemy.currentHp - remaining);
  return amount;
}

function applyDamageToPlayer(player: CharacterSheet, amount: number): number {
  let remaining = amount;
  if (player.shield && player.shield > 0) {
    if (player.shield >= remaining) {
      player.shield -= remaining;
      return amount;
    } else {
      remaining -= player.shield;
      player.shield = 0;
    }
  }
  player.currentHp = Math.max(0, player.currentHp - remaining);
  return amount;
}

function allPlayersDead(room: RoomState): boolean {
  const players = Object.values(room.players);
  return players.length > 0 && players.every((p) => p.currentHp <= 0);
}

function handleEncounterVictory(room: RoomState, events: ResolutionEvent[]) {
  if (room.stage === 1) {
    // Transition to Boss stage
    room.stage = 2;
    room.roundNumber = 1;
    room.status = 'STAGE_TRANSITION';

    // Rest between encounters: restore full party HP and regenerate Priest Mana
    for (const player of Object.values(room.players)) {
      player.currentHp = player.maxHp;
      if (player.resourceType === 'mana') {
        player.currentResource = player.maxResource;
      }
      player.shield = 0;
      player.speedModifier = 0;
    }

    const partySize = Object.keys(room.players).length;
    const boss = createScaledEnemy(2, partySize);
    room.enemy = boss;
    room.enemy.telegraphedAction = calculateNextEnemyIntent(room);

    events.push({
      actorId: 'system',
      actorName: 'Dungeon Master',
      abilityName: 'Stage Complete',
      targetId: 'ALL_PLAYERS',
      message: `⚔️ Minions cleared! The party takes a quick rest (full HP restored) as the Crypt Overseer emerges!`,
    });
  } else {
    // Stage 2 Boss defeated -> Victory
    room.status = 'VICTORY';
    events.push({
      actorId: 'system',
      actorName: 'Dungeon Master',
      abilityName: 'Victory',
      targetId: 'ALL_PLAYERS',
      message: `🏆 Victory! The Crypt Overseer is slain! The dungeon is cleansed for today!`,
    });
  }
}
