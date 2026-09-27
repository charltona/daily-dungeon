export type ClassType = 'warrior' | 'rogue' | 'priest';
export type ActorType = 'player' | 'enemy';
export type ResourceType = 'rage' | 'combo' | 'mana';

export interface ActiveBuff {
  type: 'damage_taken_increase' | 'dodge_next_attack' | 'speed_mod' | 'intervene' | 'shield';
  value: number; // percentage (e.g. 0.3 for 30%) or amount or flat value
  sourceActorId?: string;
  targetActorId?: string;
  durationRounds: number; // usually 1 round
}

export interface CharacterSheet {
  id: string;
  name: string;
  classType: ClassType;
  level: number;
  maxHp: number;
  currentHp: number;
  resourceType: ResourceType;
  maxResource: number;
  currentResource: number;
  baseSpeed: number;
  shield?: number;
  speedModifier?: number;
  dodging?: boolean;
  interceptingTargetId?: string;
  interceptedByPlayerId?: string;
}

export interface EnemyUnit {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  baseSpeed: number;
  shield?: number;
  speedModifier?: number;
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
  targetType: 'single_enemy' | 'single_ally' | 'self' | 'all_players';
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
  queuedActions?: Record<string, { abilityId: string; targetId: string }>;
}

export interface ResolutionEvent {
  actorId: string;
  actorName: string;
  abilityName: string;
  targetId: string;
  targetName?: string;
  damageDealt?: number;
  healingDone?: number;
  shieldGained?: number;
  interceptedBy?: string;
  dodged?: boolean;
  message: string;
}

export interface ResolutionBatch {
  orderedEvents: ResolutionEvent[];
  finalRoomState: RoomState;
}

export interface ClientLockActionPayload {
  roomId: string;
  abilityId: string;
  targetId: string;
}

export interface ClientJoinPayload {
  roomId: string;
  character: CharacterSheet;
}
