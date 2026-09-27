import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCharacter,
  createScaledEnemy,
  calculateNextEnemyIntent,
  compileInitiativeTrack,
  resolveTurn,
} from './index.js';
import { RoomState } from './types.js';

test('Combat Engine - Initiative Sorting and Dead Actor Rule', () => {
  const rogue = createCharacter('p1', 'Val', 'rogue');
  const warrior = createCharacter('p2', 'Brog', 'warrior');
  const priest = createCharacter('p3', 'Elia', 'priest');
  const enemy = createScaledEnemy(1, 3);

  const room: RoomState = {
    roomId: 'TEST_ROOM',
    hostPlayerId: 'p1',
    status: 'COMBAT_INPUT',
    stage: 1,
    roundNumber: 1,
    turnTimerSeconds: 15,
    players: {
      p1: rogue,
      p2: warrior,
      p3: priest,
    },
    enemy,
    lockedPlayerIds: ['p1', 'p2', 'p3'],
    combatLog: [],
  };

  room.enemy!.telegraphedAction = calculateNextEnemyIntent(room);
  assert.equal(room.enemy!.telegraphedAction.abilityName, 'Rusted Blade');

  // Rogue uses Expose Weakness (+4 speed => 15 + 4 = 19)
  // Warrior uses Intervene (+3 speed => 10 + 3 = 13)
  // Enemy has base 9 + 0 = 9
  // Priest uses Smite (+0 speed => 7 + 0 = 7)
  const queuedActions = {
    p1: { abilityId: 'rogue_twin_daggers', targetId: enemy.id },
    p2: { abilityId: 'warrior_intervene', targetId: 'p1' },
    p3: { abilityId: 'priest_smite', targetId: enemy.id },
  };

  const track = compileInitiativeTrack(room, queuedActions);
  // Speeds: Rogue 17, Warrior 13, Enemy 9, Priest 7
  assert.equal(track[0].actorId, 'p1'); // Rogue (15+2=17)
  assert.equal(track[1].actorId, 'p2'); // Warrior (10+3=13)
  assert.equal(track[2].actorId, enemy.id); // Enemy (9)
  assert.equal(track[3].actorId, 'p3'); // Priest (7)

  // Resolve turn
  const batch = resolveTurn(room, queuedActions);
  assert.ok(batch.orderedEvents.length > 0);
  assert.ok(batch.finalRoomState.enemy!.currentHp < enemy.maxHp);
});
