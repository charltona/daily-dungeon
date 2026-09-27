import { Ability, CharacterSheet, ClassType, EnemyUnit } from './types.js';

export const CLASS_ABILITIES: Record<ClassType, Ability[]> = {
  rogue: [
    {
      id: 'rogue_twin_daggers',
      name: 'Twin Daggers',
      description: 'Deal 8 Physical Damage. Generates +1 Combo Point.',
      speedModifier: 2,
      resourceCost: 0,
      targetType: 'single_enemy',
    },
    {
      id: 'rogue_expose_weakness',
      name: 'Expose Weakness',
      description: 'Target takes +30% damage from all sources until end of round.',
      speedModifier: 4,
      resourceCost: 2,
      targetType: 'single_enemy',
    },
    {
      id: 'rogue_smoke_screen',
      name: 'Smoke Screen',
      description: 'Target ally gains +5 Speed and dodges next single-target attack this round.',
      speedModifier: 0,
      resourceCost: 1,
      targetType: 'single_ally',
    },
  ],
  warrior: [
    {
      id: 'warrior_slash',
      name: 'Slash',
      description: 'Deal 10 Physical Damage. Generates +15 Rage.',
      speedModifier: 0,
      resourceCost: 0,
      targetType: 'single_enemy',
    },
    {
      id: 'warrior_intervene',
      name: 'Intervene',
      description: 'Intercept next attack against ally, taking 25% reduced damage.',
      speedModifier: 3,
      resourceCost: 10,
      targetType: 'single_ally',
    },
    {
      id: 'warrior_reckless_strike',
      name: 'Reckless Strike',
      description: 'Deal 22 Heavy Physical Damage.',
      speedModifier: -3,
      resourceCost: 25,
      targetType: 'single_enemy',
    },
  ],
  priest: [
    {
      id: 'priest_smite',
      name: 'Smite',
      description: 'Deal 7 Holy Damage. Reduces target speed by -3 on the next round.',
      speedModifier: 0,
      resourceCost: 0,
      targetType: 'single_enemy',
    },
    {
      id: 'priest_flash_heal',
      name: 'Flash Heal',
      description: 'Restore 12 HP to target ally.',
      speedModifier: 1,
      resourceCost: 12,
      targetType: 'single_ally',
    },
    {
      id: 'priest_sanctuary',
      name: 'Sanctuary',
      description: 'Grants target ally a damage shield equal to 15 HP for 1 round.',
      speedModifier: -2,
      resourceCost: 20,
      targetType: 'single_ally',
    },
  ],
};

export const CLASS_BASE_STATS: Record<
  ClassType,
  { maxHp: number; baseSpeed: number; resourceType: 'rage' | 'combo' | 'mana'; maxResource: number; initialResource: number }
> = {
  warrior: {
    maxHp: 35,
    baseSpeed: 10,
    resourceType: 'rage',
    maxResource: 100,
    initialResource: 0,
  },
  rogue: {
    maxHp: 22,
    baseSpeed: 15,
    resourceType: 'combo',
    maxResource: 5,
    initialResource: 0,
  },
  priest: {
    maxHp: 18,
    baseSpeed: 7,
    resourceType: 'mana',
    maxResource: 40,
    initialResource: 40,
  },
};

export function createCharacter(id: string, name: string, classType: ClassType): CharacterSheet {
  const stats = CLASS_BASE_STATS[classType];
  return {
    id,
    name,
    classType,
    level: 1,
    maxHp: stats.maxHp,
    currentHp: stats.maxHp,
    resourceType: stats.resourceType,
    maxResource: stats.maxResource,
    currentResource: stats.initialResource,
    baseSpeed: stats.baseSpeed,
  };
}

export const BASE_ENEMIES = {
  minion: {
    id: 'enemy_minion_vanguard',
    name: 'Skeletal Vanguard',
    baseHp: 35,
    baseSpeed: 9,
  },
  boss: {
    id: 'enemy_boss_overseer',
    name: 'Crypt Overseer',
    baseHp: 65,
    baseSpeed: 8,
  },
};
