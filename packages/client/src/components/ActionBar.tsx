import React, { useState, useEffect } from 'react';
import { Zap, Check, Clock, RotateCcw, Shield, Heart, Info } from 'lucide-react';
import { CharacterSheet, CLASS_ABILITIES, RoomState } from '@daily-dungeon/shared';

interface ActionBarProps {
  player: CharacterSheet;
  roomState: RoomState;
  isLocked: boolean;
  onLockIn: (abilityId: string, targetId: string) => void;
  onUnlock?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  player,
  roomState,
  isLocked,
  onLockIn,
  onUnlock,
}) => {
  const abilities = CLASS_ABILITIES[player.classType] || [];
  const isDead = player.currentHp <= 0;
  const isCombatInput = roomState.status === 'COMBAT_INPUT';

  // Find first affordable ability to default to
  const firstAffordable = abilities.find((a) => player.currentResource >= a.resourceCost) || abilities[0];
  const [selectedAbilityId, setSelectedAbilityId] = useState<string>(firstAffordable?.id || '');
  const [selectedTargetId, setSelectedTargetId] = useState<string>(player.id);

  // Keep selected ability valid when resource changes
  useEffect(() => {
    if (!abilities.some((a) => a.id === selectedAbilityId)) {
      setSelectedAbilityId(abilities[0]?.id || '');
    }
  }, [player.classType, abilities, selectedAbilityId]);

  const selectedAbility = abilities.find((a) => a.id === selectedAbilityId) || abilities[0];
  const isAllyTargeting = selectedAbility?.targetType === 'single_ally';

  // Living teammates for ally targeting
  const alivePlayers = Object.values(roomState.players).filter((p) => p.currentHp > 0);
  const pendingTeammates = alivePlayers.filter(
    (p) => p.id !== player.id && !roomState.lockedPlayerIds.includes(p.id)
  );

  // If locked, find locked ability details
  const queued = roomState.queuedActions?.[player.id];
  const lockedAbility = queued ? abilities.find((a) => a.id === queued.abilityId) : null;
  const lockedTargetName = queued
    ? queued.targetId === player.id
      ? 'Self'
      : roomState.players[queued.targetId]?.name || roomState.enemy?.name || 'Enemy'
    : 'Enemy';

  const handleExecuteLockIn = () => {
    if (!selectedAbility) return;
    const target = isAllyTargeting
      ? selectedTargetId || player.id
      : roomState.enemy?.id || 'enemy';
    onLockIn(selectedAbility.id, target);
  };

  // 1. Stage transition screen
  if (roomState.status === 'STAGE_TRANSITION') {
    return (
      <div className="bg-yellow-950/40 border border-yellow-600/80 rounded-xl p-3 text-center animate-pulse">
        <div className="text-yellow-300 font-bold text-xs">
          ⚔️ Stage 1 Cleared! The Crypt Overseer emerges...
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">Full health & mana restored for Boss Fight!</p>
      </div>
    );
  }

  // 2. Dead screen
  if (isDead) {
    return (
      <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-3 text-center">
        <span className="text-xs font-bold text-red-300">💀 You have fallen in combat</span>
        <p className="text-[10px] text-slate-400 mt-0.5">Spectating remaining party members...</p>
      </div>
    );
  }

  // 3. Locked in state
  if (isLocked && isCombatInput) {
    return (
      <div className="bg-dungeon-card border-2 border-emerald-500/80 rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-slate-100 text-xs truncate flex items-center gap-1.5">
                <span className="text-emerald-400">[{lockedAbility?.name || 'Action'}]</span>
                <span className="text-slate-400 font-normal">➔</span>
                <span className="text-slate-200 truncate">{lockedTargetName}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                {pendingTeammates.length > 0 ? (
                  <>
                    <Clock className="w-3 h-3 text-amber-400 animate-spin flex-shrink-0" />
                    <span>Waiting for:</span>
                    <strong className="text-amber-300 truncate">
                      {pendingTeammates.map((p) => p.name).join(', ')}
                    </strong>
                  </>
                ) : (
                  <span className="text-emerald-300 font-semibold animate-pulse">
                    ✓ All players ready! Resolving turn...
                  </span>
                )}
              </div>
            </div>
          </div>

          {pendingTeammates.length > 0 && onUnlock && (
            <button
              type="button"
              onClick={onUnlock}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-600 flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              Change
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. Resolving state
  if (!isCombatInput) {
    return (
      <div className="bg-dungeon-card/80 border border-indigo-500/40 rounded-xl p-3 text-center text-xs text-indigo-300 animate-pulse flex items-center justify-center gap-2">
        <Shield className="w-4 h-4 animate-spin" />
        Turn actions resolving...
      </div>
    );
  }

  const canAffordCurrent = selectedAbility
    ? player.currentResource >= selectedAbility.resourceCost
    : false;

  // 5. Active Combat Action Picker (3 direct buttons + inline target selector + lock in)
  return (
    <div className="space-y-1.5">
      {/* Grey Info Box Explaining Move */}
      {selectedAbility && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{selectedAbility.name}</span>
              <span className="text-[10px] font-mono text-slate-400 font-normal">
                ({selectedAbility.targetType === 'single_ally' ? 'Ally' : 'Enemy'})
              </span>
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              Spd {selectedAbility.speedModifier >= 0 ? `+${selectedAbility.speedModifier}` : selectedAbility.speedModifier}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            {selectedAbility.description}
          </p>
        </div>
      )}

      {/* 3 Direct Ability Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {abilities.map((ability) => {
          const affordable = player.currentResource >= ability.resourceCost;
          const isSelected = selectedAbility?.id === ability.id;
          const speedSign = ability.speedModifier >= 0 ? `+${ability.speedModifier}` : `${ability.speedModifier}`;

          return (
            <button
              key={ability.id}
              type="button"
              disabled={!affordable}
              onClick={() => {
                setSelectedAbilityId(ability.id);
                if (ability.targetType === 'single_ally' && selectedTargetId === roomState.enemy?.id) {
                  setSelectedTargetId(player.id);
                }
              }}
              className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-amber-400 bg-amber-950/80 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400 text-amber-100'
                  : affordable
                  ? 'border-dungeon-border bg-dungeon-card hover:border-slate-500 text-slate-300'
                  : 'border-slate-800/80 bg-slate-950/60 opacity-35 text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <span className="font-extrabold text-xs leading-tight truncate">
                  {ability.name}
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold flex-shrink-0">
                  {speedSign}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400 font-mono">
                <span>
                  {ability.resourceCost === 0 ? 'Free' : `${ability.resourceCost} ${player.resourceType.slice(0, 4)}`}
                </span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Inline Ally Target Selector (Only shown if selected ability targets ally) */}
      {isAllyTargeting && (
        <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-2 flex items-center gap-1.5 text-xs animate-in fade-in">
          <span className="text-[10px] uppercase font-bold text-blue-300 font-mono flex-shrink-0 flex items-center gap-1">
            <Heart className="w-3 h-3 text-emerald-400" /> Target:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1">
            {/* Self target */}
            <button
              type="button"
              onClick={() => setSelectedTargetId(player.id)}
              className={`px-2 py-0.5 rounded-lg border text-xs font-mono font-bold transition-all flex-shrink-0 cursor-pointer ${
                selectedTargetId === player.id
                  ? 'border-blue-400 bg-blue-600 text-white'
                  : 'border-blue-800/80 bg-blue-950/60 text-blue-200'
              }`}
            >
              You ({player.currentHp} HP)
            </button>

            {/* Living Teammates */}
            {alivePlayers
              .filter((p) => p.id !== player.id)
              .map((ally) => (
                <button
                  key={ally.id}
                  type="button"
                  onClick={() => setSelectedTargetId(ally.id)}
                  className={`px-2 py-0.5 rounded-lg border text-xs font-mono font-bold transition-all flex-shrink-0 cursor-pointer ${
                    selectedTargetId === ally.id
                      ? 'border-blue-400 bg-blue-600 text-white'
                      : 'border-blue-800/80 bg-blue-950/60 text-blue-200'
                  }`}
                >
                  {ally.name} ({ally.currentHp} HP)
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Big Direct Lock-In Button */}
      <button
        type="button"
        disabled={!canAffordCurrent}
        onClick={handleExecuteLockIn}
        className={`w-full py-2.5 px-4 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
          canAffordCurrent
            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20 active:scale-[0.99]'
            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
        }`}
      >
        <Zap className="w-4 h-4 fill-current text-slate-950" />
        <span>
          Lock Move: {selectedAbility?.name || 'Action'}
          {isAllyTargeting ? (
            <span className="font-mono text-slate-900 font-bold ml-1">
              ➔ {selectedTargetId === player.id ? 'Self' : roomState.players[selectedTargetId]?.name || 'Ally'}
            </span>
          ) : (
            <span className="font-mono text-slate-900 font-bold ml-1">
              ➔ {roomState.enemy?.name || 'Enemy'}
            </span>
          )}
        </span>
      </button>
    </div>
  );
};
