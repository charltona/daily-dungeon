import {
  CharacterSheet,
  createScaledEnemy,
  calculateNextEnemyIntent,
  resolveTurn,
  ResolutionBatch,
  RoomState,
} from '@daily-dungeon/shared';

export interface RoomBroadcastCallbacks {
  broadcastRoomState: (roomId: string, state: RoomState) => void;
  broadcastTimerTick: (roomId: string, remainingSeconds: number) => void;
  broadcastResolutionBatch: (roomId: string, batch: ResolutionBatch) => void;
}

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private socketToPlayer: Map<string, { roomId: string; playerId: string }> = new Map();
  private callbacks: RoomBroadcastCallbacks;

  constructor(callbacks: RoomBroadcastCallbacks) {
    this.callbacks = callbacks;
  }

  public getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  public getPlayerBySocket(socketId: string) {
    return this.socketToPlayer.get(socketId);
  }

  public joinRoom(roomId: string, character: CharacterSheet, socketId: string): RoomState {
    let room = this.rooms.get(roomId);

    if (!room) {
      room = {
        roomId,
        hostPlayerId: character.id,
        status: 'LOBBY',
        stage: 1,
        roundNumber: 1,
        turnTimerSeconds: 15,
        players: {},
        enemy: null,
        lockedPlayerIds: [],
        combatLog: [
          `Welcome to Daily Dungeon! Room ${roomId} created. Invite your party and click Start Encounter!`,
        ],
        queuedActions: {},
      };
      this.rooms.set(roomId, room);
    }

    // Ensure clean class name for testing (e.g. Warrior, Rogue, Priest, Warrior 2)
    const baseName = character.classType.charAt(0).toUpperCase() + character.classType.slice(1);
    const existingPlayers = Object.values(room.players).filter((p) => p.id !== character.id);
    const sameClassCount = existingPlayers.filter((p) => p.classType === character.classType).length;
    character.name = sameClassCount === 0 ? baseName : `${baseName} ${sameClassCount + 1}`;

    // Register or update player
    room.players[character.id] = character;
    this.socketToPlayer.set(socketId, { roomId, playerId: character.id });

    // If host left previously, set current player as host
    if (!room.players[room.hostPlayerId]) {
      room.hostPlayerId = character.id;
    }

    this.callbacks.broadcastRoomState(roomId, room);
    return room;
  }

  public leaveRoom(socketId: string) {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return;
    const { roomId, playerId } = mapping;
    this.socketToPlayer.delete(socketId);

    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.status === 'LOBBY') {
      delete room.players[playerId];
      // Update host if host left
      if (room.hostPlayerId === playerId) {
        const remainingIds = Object.keys(room.players);
        if (remainingIds.length > 0) {
          room.hostPlayerId = remainingIds[0];
        }
      }
      if (Object.keys(room.players).length === 0) {
        this.rooms.delete(roomId);
        return;
      }
    } else {
      // In combat: mark player down or keep character sheet
      room.combatLog.push(`${room.players[playerId]?.name || 'Player'} disconnected.`);
    }

    this.callbacks.broadcastRoomState(roomId, room);
  }

  public startGame(roomId: string, requestingPlayerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.hostPlayerId !== requestingPlayerId) return false;
    if (Object.keys(room.players).length === 0) return false;

    // Reset combat state for fresh match
    room.status = 'COMBAT_INPUT';
    room.stage = 1;
    room.roundNumber = 1;
    room.lockedPlayerIds = [];
    room.queuedActions = {};
    room.combatLog = [`⚔️ The party enters The Sunken Crypt! Encounter 1 begins!`];

    // Reset players HP and resources
    for (const player of Object.values(room.players)) {
      player.currentHp = player.maxHp;
      player.currentResource = player.resourceType === 'mana' ? player.maxResource : 0;
      player.shield = 0;
      player.speedModifier = 0;
    }

    // Spawn stage 1 minion scaled to party size
    const partySize = Object.keys(room.players).length;
    room.enemy = createScaledEnemy(1, partySize);
    room.enemy.telegraphedAction = calculateNextEnemyIntent(room);

    this.callbacks.broadcastRoomState(roomId, room);
    return true;
  }

  public lockPlayerAction(
    roomId: string,
    playerId: string,
    abilityId: string,
    targetId: string
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'COMBAT_INPUT') return false;

    const player = room.players[playerId];
    if (!player || player.currentHp <= 0) return false;

    if (!room.queuedActions) room.queuedActions = {};
    room.queuedActions[playerId] = { abilityId, targetId };

    if (!room.lockedPlayerIds.includes(playerId)) {
      room.lockedPlayerIds.push(playerId);
      room.combatLog.push(`✓ ${player.name} locked in their move!`);
      if (room.combatLog.length > 50) {
        room.combatLog = room.combatLog.slice(-50);
      }
    }

    this.callbacks.broadcastRoomState(roomId, room);

    // Check if all alive players have locked in
    const alivePlayerIds = Object.values(room.players)
      .filter((p) => p.currentHp > 0)
      .map((p) => p.id);

    const allLocked = alivePlayerIds.every((id) => room.lockedPlayerIds.includes(id));
    if (allLocked && alivePlayerIds.length > 0) {
      this.resolveCurrentTurn(roomId);
    }

    return true;
  }

  public unlockPlayerAction(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'COMBAT_INPUT') return false;

    const player = room.players[playerId];
    if (!player) return false;

    room.lockedPlayerIds = room.lockedPlayerIds.filter((id) => id !== playerId);
    if (room.queuedActions) {
      delete room.queuedActions[playerId];
    }
    room.combatLog.push(`↩ ${player.name} is reconsidering their action.`);
    if (room.combatLog.length > 50) {
      room.combatLog = room.combatLog.slice(-50);
    }

    this.callbacks.broadcastRoomState(roomId, room);
    return true;
  }

  private resolveCurrentTurn(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'COMBAT_RESOLUTION';
    this.callbacks.broadcastRoomState(roomId, room);

    const queued = room.queuedActions || {};
    const batch = resolveTurn(room, queued);

    // Merge events into combat log
    for (const ev of batch.orderedEvents) {
      batch.finalRoomState.combatLog.push(ev.message);
    }
    // Limit combat log size
    if (batch.finalRoomState.combatLog.length > 50) {
      batch.finalRoomState.combatLog = batch.finalRoomState.combatLog.slice(-50);
    }

    // Save final room state
    this.rooms.set(roomId, batch.finalRoomState);

    // Broadcast batch to clients for staggered playback
    this.callbacks.broadcastResolutionBatch(roomId, batch);

    // If combat continues, wait for playback duration before starting next input phase
    if (batch.finalRoomState.status === 'COMBAT_INPUT') {
      const playbackDelayMs = Math.max(1500, batch.orderedEvents.length * 600 + 400);
      setTimeout(() => {
        const activeRoom = this.rooms.get(roomId);
        if (activeRoom && activeRoom.status === 'COMBAT_INPUT') {
          activeRoom.lockedPlayerIds = [];
          activeRoom.queuedActions = {};
          this.callbacks.broadcastRoomState(roomId, activeRoom);
        }
      }, playbackDelayMs);
    } else if (batch.finalRoomState.status === 'STAGE_TRANSITION') {
      // Transitioning to stage 2 boss after playback finishes
      const playbackDelayMs = Math.max(2500, batch.orderedEvents.length * 600 + 1200);
      setTimeout(() => {
        const activeRoom = this.rooms.get(roomId);
        if (activeRoom && activeRoom.status === 'STAGE_TRANSITION') {
          activeRoom.status = 'COMBAT_INPUT';
          activeRoom.lockedPlayerIds = [];
          activeRoom.queuedActions = {};
          if (activeRoom.enemy && !activeRoom.enemy.telegraphedAction) {
            activeRoom.enemy.telegraphedAction = calculateNextEnemyIntent(activeRoom);
          }
          activeRoom.combatLog.push(`⚡ Stage 2: The Crypt Overseer is ready! Choose your actions!`);
          this.callbacks.broadcastRoomState(roomId, activeRoom);
        }
      }, playbackDelayMs);
    } else {
      // VICTORY or DEFEAT: broadcast final state
      this.callbacks.broadcastRoomState(roomId, batch.finalRoomState);
    }
  }
}
