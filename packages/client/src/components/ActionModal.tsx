import React, { useState, useEffect } from 'react';
import { X, Sword, Shield, Zap, Skull, Users, Check, AlertCircle } from 'lucide-react';
import { Ability, CharacterSheet, CLASS_ABILITIES, RoomState } from '@daily-dungeon/shared';

interface ActionModalProps {
  player: CharacterSheet;
  roomState: RoomState;
  isOpen: boolean;
  initialAbilityId?: string | null;
  onClose: () => void;
  onLockIn: (abilityId: string, targetId: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  player,
  roomState,
  isOpen,
  initialAbilityId,
  onClose,
  onLockIn,
}) => {
  const abilities = CLASS_ABILITIES[player.classType] || [];

  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // When modal opens, select the clicked skill and automatically update relevant targets
  useEffect(() => {
    if (!isOpen) return;

    const abilityToSelect =
      abilities.find((a) => a.id === initialAbilityId) ||
      abilities.find((a) => player.currentResource >= a.resourceCost) ||
      abilities[0];

    if (abilityToSelect) {
      setSelectedAbilityId(abilityToSelect.id);
      if (abilityToSelect.targetType === 'single_enemy') {
        setSelectedTargetId(roomState.enemy?.id ?? null);
      } else if (abilityToSelect.targetType === 'single_ally') {
        setSelectedTargetId(player.id);
      }
    }
  }, [isOpen, initialAbilityId, roomState.enemy?.id, player.id]);

  if (!isOpen) return null;

  const currentAbility = abilities.find((a) => a.id === selectedAbilityId) || null;
  const isEnemyTargetAbility = currentAbility?.targetType === 'single_enemy';
  const isAllyTargetAbility = currentAbility?.targetType === 'single_ally';

  const handleSelectAbility = (ability: Ability) => {
    if (player.currentResource < ability.resourceCost) return;
    setSelectedAbilityId(ability.id);

    // Automatically update target with relevant target
    if (ability.targetType === 'single_enemy') {
      setSelectedTargetId(roomState.enemy?.id ?? null);
    } else if (ability.targetType === 'single_ally') {
      if (!selectedTargetId || selectedTargetId === roomState.enemy?.id) {
        setSelectedTargetId(player.id);
      }
    }
  };

  const handleSelectTarget = (targetId: string, isEnemy: boolean) => {
    if (!currentAbility) return;
    if (isEnemyTargetAbility && !isEnemy) return;
    if (isAllyTargetAbility && isEnemy) return;
    setSelectedTargetId(targetId);
  };

  const canConfirm =
    selectedAbilityId !== null &&
    selectedTargetId !== null &&
    currentAbility !== null &&
    player.currentResource >= currentAbility.resourceCost;

  const handleConfirm = () => {
    if (!canConfirm || !selectedAbilityId || !selectedTargetId) return;
    onLockIn(selectedAbilityId, selectedTargetId);
    onClose();
  };

  const enemy = roomState.enemy;
  const allies = Object.values(roomState.players);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-dungeon-card border border-dungeon-border rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-dungeon-border flex items-center justify-between bg-dungeon-darker/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-600/80 text-amber-400">
              <Sword className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                <span>Select Your Action</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  {player.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Choose a skill and assign a target for this round</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Select Skill */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                Choose Skill
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {player.resourceType.toUpperCase()}: {player.currentResource}/{player.maxResource}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {abilities.map((ability) => {
                const isSelected = selectedAbilityId === ability.id;
                const affordable = player.currentResource >= ability.resourceCost;
                const speedSign = ability.speedModifier >= 0 ? `+${ability.speedModifier}` : `${ability.speedModifier}`;

                return (
                  <button
                    key={ability.id}
                    type="button"
                    disabled={!affordable}
                    onClick={() => handleSelectAbility(ability)}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/50 ring-2 ring-amber-500/60 shadow-lg'
                        : affordable
                        ? 'border-dungeon-border bg-dungeon-darker/70 hover:border-slate-600 hover:bg-dungeon-darker'
                        : 'border-slate-800 bg-slate-950/40 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                          {ability.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold ${
                            ability.speedModifier > 0
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : ability.speedModifier < 0
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {speedSign} Spd
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug mb-2">
                        {ability.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono border-t border-dungeon-border/50 pt-1.5">
                      <span>
                        {ability.resourceCost === 0 ? (
                          <strong className="text-emerald-400">Free</strong>
                        ) : (
                          <strong className={affordable ? 'text-amber-400' : 'text-red-400'}>
                            Cost: {ability.resourceCost} {player.resourceType}
                          </strong>
                        )}
                      </span>
                      <span className="text-[9px] uppercase text-slate-400">
                        {ability.targetType === 'single_enemy' ? 'Enemy' : 'Ally'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Target Selection (Enemies on Top, Line, Allies on Bottom) */}
          <div className="bg-dungeon-darker/60 rounded-xl p-4 border border-dungeon-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                Choose Target
              </span>

              {currentAbility ? (
                <span className="text-[11px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  {isEnemyTargetAbility ? 'Target: Single Enemy' : 'Target: Single Ally'}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 italic">Select a skill above first</span>
              )}
            </div>

            {/* TOP SECTION: ENEMIES */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
                <Skull className="w-3.5 h-3.5" />
                <span>Enemies (Target Area)</span>
              </div>

              {enemy && enemy.currentHp > 0 ? (
                <button
                  type="button"
                  disabled={!currentAbility || !isEnemyTargetAbility}
                  onClick={() => handleSelectTarget(enemy.id, true)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedTargetId === enemy.id
                      ? 'border-red-500 bg-red-950/60 ring-2 ring-red-500/60 shadow-md'
                      : isEnemyTargetAbility
                      ? 'border-red-900/60 bg-red-950/20 hover:border-red-700 hover:bg-red-950/40 cursor-pointer'
                      : 'border-slate-800 bg-slate-900/40 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedTargetId === enemy.id
                          ? 'bg-red-600 text-white'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      <Skull className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                        {enemy.name}
                        {enemy.shield ? (
                          <span className="text-[10px] text-blue-300 font-mono">
                            (+{enemy.shield} Shield)
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-red-300 font-mono">
                        HP: {enemy.currentHp} / {enemy.maxHp} &bull; Base Speed: {enemy.baseSpeed}
                      </div>
                    </div>
                  </div>

                  <div>
                    {selectedTargetId === enemy.id ? (
                      <span className="flex items-center gap-1 text-xs font-extrabold text-red-300 bg-red-950 px-2.5 py-1 rounded-full border border-red-500">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : isEnemyTargetAbility ? (
                      <span className="text-xs text-slate-400 font-medium">Click to Target</span>
                    ) : null}
                  </div>
                </button>
              ) : (
                <div className="text-xs text-slate-500 italic p-2">No active enemy</div>
              )}
            </div>

            {/* DIVIDING LINE */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-dungeon-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-dungeon-darker px-3 text-slate-400 font-mono text-[10px] tracking-widest font-semibold">
                  Divider &bull; Allies Below
                </span>
              </div>
            </div>

            {/* BOTTOM SECTION: ALLIES */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Allies (Target Area)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allies.map((ally) => {
                  const isSelf = ally.id === player.id;
                  const isSelected = selectedTargetId === ally.id;
                  const isDead = ally.currentHp <= 0;

                  return (
                    <button
                      key={ally.id}
                      type="button"
                      disabled={!currentAbility || !isAllyTargetAbility || isDead}
                      onClick={() => handleSelectTarget(ally.id, false)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/60 ring-2 ring-blue-500/60 shadow-md'
                          : isAllyTargetAbility && !isDead
                          ? 'border-blue-900/60 bg-blue-950/20 hover:border-blue-700 hover:bg-blue-950/40 cursor-pointer'
                          : 'border-slate-800 bg-slate-900/40 opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs uppercase ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}
                        >
                          {ally.classType[0]}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-100 flex items-center gap-1">
                            {ally.name}
                            {isSelf && (
                              <span className="text-[10px] text-amber-400 font-normal">(You)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            HP: {ally.currentHp}/{ally.maxHp}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-300 bg-blue-950 px-2 py-0.5 rounded-full border border-blue-500">
                            <Check className="w-3 h-3" /> Selected
                          </span>
                        ) : isAllyTargetAbility && !isDead ? (
                          <span className="text-[10px] text-slate-400">Select</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-dungeon-border bg-dungeon-darker/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300 font-mono">
            {canConfirm ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Ready to Lock: [{currentAbility?.name}] on [
                {selectedTargetId === enemy?.id
                  ? enemy?.name
                  : allies.find((a) => a.id === selectedTargetId)?.name}
                ]
              </span>
            ) : !selectedAbilityId ? (
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Step 1: Choose a skill from above
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Step 2: Choose your target (
                {isEnemyTargetAbility ? 'Enemy at top' : 'Ally at bottom'})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className={`px-5 py-2 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1.5 shadow-lg ${
                canConfirm
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-slate-950 hover:shadow-amber-500/25 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              Lock In Action
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
