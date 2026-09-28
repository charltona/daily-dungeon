import React from 'react';
import { Heart, Zap, Check, Clock, User } from 'lucide-react';
import { CharacterSheet } from '@daily-dungeon/shared';
import { FloatingCombatText, FloatingTextItem } from './FloatingCombatText';

interface PartyCardProps {
  players: Record<string, CharacterSheet>;
  currentPlayerId: string;
  lockedPlayerIds: string[];
  queuedActions?: Record<string, { abilityId: string; targetId: string }>;
  enemyName?: string;
  onSelectAllyTarget?: (allyId: string) => void;
  selectedTargetId?: string | null;
  activeActorId?: string;
  floatingTexts?: FloatingTextItem[];
  impactEffects?: Record<string, 'damage' | 'heal'>;
}

export const PartyCard: React.FC<PartyCardProps> = ({
  players,
  currentPlayerId,
  lockedPlayerIds,
  onSelectAllyTarget,
  selectedTargetId,
  activeActorId,
  floatingTexts = [],
  impactEffects = {},
}) => {
  const currentPlayer = players[currentPlayerId];
  const teammates = Object.values(players).filter((p) => p.id !== currentPlayerId);

  if (!currentPlayer) return null;

  const hpPercent = Math.max(
    0,
    Math.min(100, Math.round((currentPlayer.currentHp / currentPlayer.maxHp) * 100))
  );
  const resPercent = Math.max(
    0,
    Math.min(100, Math.round((currentPlayer.currentResource / currentPlayer.maxResource) * 100))
  );
  const isCurrentLocked = lockedPlayerIds.includes(currentPlayerId);

  const heroTexts = floatingTexts.filter((t) => t.targetId === currentPlayerId);
  const heroImpact = impactEffects[currentPlayerId];

  return (
    <div className="space-y-2">
      {/* 1. Teammates Status Row (Super compact chips) */}
      {teammates.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider flex-shrink-0">
            Party:
          </span>
          {teammates.map((teammate) => {
            const isLocked = lockedPlayerIds.includes(teammate.id);
            const isDead = teammate.currentHp <= 0;
            const isTargeted = selectedTargetId === teammate.id;
            const isActing = activeActorId === teammate.id;
            const teammateTexts = floatingTexts.filter((t) => t.targetId === teammate.id);
            const teammateImpact = impactEffects[teammate.id];

            return (
              <button
                key={teammate.id}
                type="button"
                onClick={() => onSelectAllyTarget && onSelectAllyTarget(teammate.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono transition-all flex-shrink-0 cursor-pointer relative overflow-visible ${
                  teammateImpact === 'damage'
                    ? 'border-red-500 bg-red-950/80 ring-2 ring-red-500 animate-damage-shake text-white'
                    : teammateImpact === 'heal'
                    ? 'border-emerald-500 bg-emerald-950/80 ring-2 ring-emerald-500 animate-heal-pulse text-white'
                    : isActing
                    ? 'border-amber-400 bg-amber-950 ring-2 ring-amber-400 text-white animate-pulse'
                    : isTargeted
                    ? 'border-blue-400 bg-blue-950/80 ring-1 ring-blue-400 text-white'
                    : isDead
                    ? 'border-slate-800 bg-slate-900/60 opacity-40 line-through text-slate-500'
                    : isLocked
                    ? 'border-emerald-600/80 bg-emerald-950/50 text-emerald-200'
                    : 'border-dungeon-border bg-dungeon-darker text-slate-300'
                }`}
              >
                <FloatingCombatText items={teammateTexts} position="top" />
                <span className="font-bold text-[11px]">{teammate.name}</span>
                <span className="text-[10px] text-red-300 font-semibold">
                  {teammate.currentHp}/{teammate.maxHp}
                </span>
                {isLocked ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Your Hero Card (Prominent & Clear) */}
      <div
        className={`rounded-xl border p-2.5 transition-all relative overflow-visible ${
          heroImpact === 'damage'
            ? 'bg-red-950/30 border-2 border-red-500 ring-4 ring-red-500/70 animate-damage-shake'
            : heroImpact === 'heal'
            ? 'bg-emerald-950/30 border-2 border-emerald-500 ring-4 ring-emerald-500/70 animate-heal-pulse'
            : activeActorId === currentPlayerId
            ? 'bg-dungeon-card/95 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
            : isCurrentLocked
            ? 'bg-dungeon-card/95 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : 'bg-dungeon-card border-amber-500/60 shadow-md'
        }`}
      >
        {/* Floating Combat Numbers over Hero */}
        <FloatingCombatText items={heroTexts} />
        {/* Top: Name & Lock Indicator */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm text-slate-100 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-400 inline" />
              {currentPlayer.name} (You)
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Spd {currentPlayer.baseSpeed}
            </span>
          </div>

          <div>
            {isCurrentLocked ? (
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> READY
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-700/60 animate-pulse">
                Pick Move
              </span>
            )}
          </div>
        </div>

        {/* HP Bar */}
        <div className="mb-1.5">
          <div className="flex justify-between text-[11px] font-mono mb-0.5 text-slate-300">
            <span className="flex items-center gap-1 text-slate-400">
              <Heart className="w-3 h-3 text-red-400" /> HP
            </span>
            <span>
              <strong className="text-red-300 font-bold">{currentPlayer.currentHp}</strong> /{' '}
              {currentPlayer.maxHp}
              {currentPlayer.shield ? (
                <span className="text-blue-300 ml-1 font-bold">(+{currentPlayer.shield})</span>
              ) : null}
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700/60 p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Resource Bar */}
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-0.5 text-slate-300">
            <span className="flex items-center gap-1 text-slate-400 capitalize">
              <Zap className="w-3 h-3 text-amber-400" /> {currentPlayer.resourceType}
            </span>
            <span className="font-bold">
              {currentPlayer.currentResource} / {currentPlayer.maxResource}
            </span>
          </div>

          {currentPlayer.resourceType === 'combo' ? (
            <div className="flex gap-1.5 h-2">
              {[1, 2, 3, 4, 5].map((pip) => (
                <div
                  key={pip}
                  className={`flex-1 rounded-sm border ${
                    pip <= currentPlayer.currentResource
                      ? 'bg-amber-400 border-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-700/60 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentPlayer.resourceType === 'rage'
                    ? 'bg-gradient-to-r from-orange-600 to-red-500'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${resPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
